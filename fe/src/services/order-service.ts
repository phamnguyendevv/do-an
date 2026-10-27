import {
  ORDER_STATUS_TRANSITIONS,
  PAYMENT_STATUS_TRANSITIONS,
  type Order,
  type OrderItem,
  type OrderStatus,
  type PaymentStatus,
} from "@/types";
import { applyStockDeltas, store } from "./store";
import { checkAvailability, validateLines, type Result, type StockLine } from "./inventory-service";
import { orderApi, type OrderApiItem } from "@/lib/order-api";

/** Map API response to local Order type */
function mapApiOrder(o: OrderApiItem): Order {
  return {
    id: String(o.id),
    orderCode: o.orderCode,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerAddress: o.customerAddress,
    provinceId: o.provinceId,
    districtId: o.districtId,
    wardCode: o.wardCode,
    items: (o.items || []).map((it) => ({
      bookId: String(it.bookId),
      title: it.title,
      quantity: it.quantity,
      price: Number(it.price),
    })),
    subtotal: Number(o.subtotal),
    discount: Number(o.discount),
    shippingFee: Number(o.shippingFee),
    total: Number(o.total),
    payment: o.payment as PaymentStatus,
    shippingMethod: o.shippingMethod,
    trackingCode: o.trackingCode,
    note: o.note,
    status: o.status as OrderStatus,
    createdAt: o.createdAt,
  };
}

/** Allowed order status transitions (warehouse workflow). */
export const orderTransitions = ORDER_STATUS_TRANSITIONS;

/** Statuses that release the reserved stock back into the warehouse. */
const RESTOCK_STATUSES: OrderStatus[] = ["CANCELLED", "RETURNED"];

export const orderService = {
  /** Create an order; stock is reserved (decreased) right away. */
  async createOrder(input: {
    orderCode?: string;
    customerName: string;
    customerPhone: string;
    customerId?: number;
    customerAddress: string;
    shippingMethod: string;
    shippingFee: number;
    discount: number;
    promotionCode?: string;
    trackingCode?: string;
    note?: string;
    expectedDelivery?: string;
    lines: StockLine[];
    provinceId?: number;
    districtId?: number;
    wardCode?: string;
    status?: OrderStatus;
    payment?: PaymentStatus;
  }): Promise<Result<Order>> {
    if (!input.customerName || !input.customerPhone)
      return { ok: false, error: "Vui lòng nhập tên và số điện thoại khách hàng." };
    const invalid = validateLines(input.lines, true);
    if (invalid) return { ok: false, error: invalid };
    const shortage = checkAvailability(input.lines);
    if (shortage) return { ok: false, error: shortage };

    const isPos =
      input.shippingMethod?.includes("POS") ||
      input.shippingMethod?.includes("quầy") ||
      input.status === "DELIVERED";

    const defaultStatus: OrderStatus = input.status || (isPos ? "DELIVERED" : "PENDING");
    const defaultPayment: PaymentStatus = input.payment || (isPos ? "PAID" : "UNPAID");

    const { books } = store.getSnapshot();
    const items: Array<{ bookId: string; title: string; quantity: number; price: number }> =
      input.lines.map((l) => ({
        bookId: String(l.bookId),
        title: books.find((b) => b.id === l.bookId)?.title ?? String(l.bookId),
        quantity: l.quantity,
        price: l.price,
      }));

    // Try to save to backend DB first
    try {
      const created = await orderApi.create({
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerAddress: input.customerAddress,
        ...(input.orderCode !== undefined ? { orderCode: input.orderCode } : {}),
        ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
        ...(input.provinceId !== undefined ? { provinceId: input.provinceId } : {}),
        ...(input.districtId !== undefined ? { districtId: input.districtId } : {}),
        ...(input.wardCode !== undefined ? { wardCode: input.wardCode } : {}),
        items,
        shippingFee: input.shippingFee,
        discount: input.discount,
        ...(input.promotionCode !== undefined ? { promotionCode: input.promotionCode } : {}),
        shippingMethod: input.shippingMethod,
        ...(input.trackingCode !== undefined ? { trackingCode: input.trackingCode } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
        status: defaultStatus,
        payment: defaultPayment,
      });

      // Sync with local store + localStorage
      const order = mapApiOrder(created);
      const { orders, shipments } = store.getSnapshot();
      const newShipments = [...shipments];
      newShipments.unshift({
        id: `SHP-${3000 + shipments.length + 1}`,
        orderId: order.id,
        customerName: order.customerName || "Khách lẻ",
        carrier: order.shippingMethod || "Giao Hàng Nhanh (GHN)",
        trackingNumber: order.trackingCode || `GHN-${Date.now().toString().slice(-6)}`,
        shippingFee: order.shippingFee || 0,
        expectedDelivery: input.expectedDelivery || new Date().toISOString().slice(0, 10),
        status: order.status === "DELIVERED" ? "DELIVERED" : "WAITING_PICKUP",
        address: order.customerAddress || "",
      });
      store.setState({ orders: [order, ...orders], shipments: newShipments });
      applyStockDeltas(
        input.lines.reduce<Record<string, number>>((acc, l) => {
          acc[l.bookId] = (acc[l.bookId] ?? 0) - l.quantity;
          return acc;
        }, {}),
      );
      return { ok: true, data: order };
    } catch (apiError) {
      return {
        ok: false,
        error:
          apiError instanceof Error
            ? apiError.message
            : "Không thể lưu đơn hàng vào máy chủ. Tồn kho chưa được thay đổi.",
      };
    }
  },

  /** Move an order through the warehouse workflow, restocking when cancelled/returned. */
  async updateStatus(orderId: string, next: OrderStatus): Promise<Result<Order>> {
    const { orders } = store.getSnapshot();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, error: "Không tìm thấy đơn hàng." };
    if (order.status !== next && !orderTransitions[order.status].includes(next))
      return { ok: false, error: "Không thể chuyển sang trạng thái này." };

    // Persist the status transition before changing local state.
    try {
      const idNum = parseInt(orderId, 10);
      if (isNaN(idNum)) {
        return { ok: false, error: "Mã đơn hàng không hợp lệ để cập nhật trên máy chủ." };
      }
      const updated = await orderApi.updateStatus(idNum, next);
      const localOrder = mapApiOrder(updated);
      store.setState({ orders: orders.map((o) => (o.id === orderId ? localOrder : o)) });

      const shouldRestock =
        RESTOCK_STATUSES.includes(next) && !RESTOCK_STATUSES.includes(order.status);
      if (shouldRestock) {
        applyStockDeltas(
          order.items.reduce<Record<string, number>>((acc, it) => {
            acc[it.bookId] = (acc[it.bookId] ?? 0) + it.quantity;
            return acc;
          }, {}),
        );
      }
      return { ok: true, data: localOrder };
    } catch (apiError) {
      return {
        ok: false,
        error:
          apiError instanceof Error
            ? apiError.message
            : "Không thể lưu trạng thái đơn hàng vào máy chủ.",
      };
    }
  },

  /** Update payment state manually (e.g. cash collected at the counter). */
  async updatePayment(orderId: string, payment: PaymentStatus): Promise<Result<Order>> {
    const { orders } = store.getSnapshot();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, error: "Không tìm thấy đơn hàng." };
    if (order.payment !== payment && !PAYMENT_STATUS_TRANSITIONS[order.payment].includes(payment))
      return { ok: false, error: "Không thể chuyển sang trạng thái thanh toán này." };

    try {
      const idNum = parseInt(orderId, 10);
      if (isNaN(idNum)) {
        return { ok: false, error: "Mã đơn hàng không hợp lệ để cập nhật trên máy chủ." };
      }
      const updated = await orderApi.updatePayment(idNum, payment);
      const localOrder = mapApiOrder(updated);
      store.setState({ orders: orders.map((o) => (o.id === orderId ? localOrder : o)) });
      return { ok: true, data: localOrder };
    } catch (apiError) {
      return {
        ok: false,
        error:
          apiError instanceof Error
            ? apiError.message
            : "Không thể lưu trạng thái thanh toán vào máy chủ.",
      };
    }
  },

  /** Fetch fresh order list from backend and sync to store. */
  async refreshFromApi(): Promise<void> {
    try {
      const res = await orderApi.list({ size: 200 });
      const items = Array.isArray(res?.data) ? res.data : [];
      const orders = items.map(mapApiOrder);
      store.setState({ orders });
    } catch (e) {
      console.warn("Cannot fetch orders from backend API:", e);
    }
  },

  /**
   * Cập nhật thông tin đơn hàng PENDING.
   * - Nếu đơn có trackingCode GHN → gọi GHN Update Order API
   * - Luôn cập nhật DB nội bộ và local store
   */
  async updateOrderInfo(
    orderId: string,
    payload: {
      customerName?: string;
      customerPhone?: string;
      customerAddress?: string;
      note?: string;
      // GHN-specific
      toWardCode?: string;
      toDistrictId?: number;
      codAmount?: number;
      weight?: number;
      length?: number;
      width?: number;
      height?: number;
      insuranceValue?: number;
      paymentTypeId?: 1 | 2;
      requiredNote?: "CHOTHUHANG" | "CHOXEMHANGKHONGTHU" | "KHONGCHOXEMHANG";
      content?: string;
    },
    ghnTrackingCode?: string,
  ): Promise<Result<Order>> {
    const { orders } = store.getSnapshot();
    const order = orders.find((o) => o.id === orderId || o.orderCode === orderId);
    if (!order) return { ok: false, error: "Không tìm thấy đơn hàng trong hệ thống." };
    if (order.status !== "PENDING")
      return { ok: false, error: "Chỉ được sửa đơn hàng ở trạng thái Chờ xử lý." };

    // 1. Gọi GHN Update Order API nếu có tracking code
    const trackingCode = ghnTrackingCode || order.trackingCode;
    if (trackingCode) {
      const ghnPayload: any = {
        order_code: trackingCode,
      };
      if (payload.customerName) ghnPayload.to_name = payload.customerName;
      if (payload.customerPhone) ghnPayload.to_phone = payload.customerPhone;
      if (payload.customerAddress) ghnPayload.to_address = payload.customerAddress;
      if (payload.toWardCode) ghnPayload.to_ward_code = payload.toWardCode;
      if (payload.toDistrictId) ghnPayload.to_district_id = Number(payload.toDistrictId);
      if (payload.content) ghnPayload.content = payload.content;
      if (payload.weight) ghnPayload.weight = Number(payload.weight);
      if (payload.length) ghnPayload.length = Number(payload.length);
      if (payload.width) ghnPayload.width = Number(payload.width);
      if (payload.height) ghnPayload.height = Number(payload.height);
      if (payload.insuranceValue !== undefined && payload.insuranceValue > 0) {
        ghnPayload.insurance_value = Number(payload.insuranceValue);
      }
      if (payload.paymentTypeId) ghnPayload.payment_type_id = Number(payload.paymentTypeId);
      if (payload.note !== undefined) ghnPayload.note = payload.note;
      if (payload.requiredNote) ghnPayload.required_note = payload.requiredNote;

      try {
        const { ghnApi } = await import("@/lib/ghn-api");
        await ghnApi.updateOrder(ghnPayload);
      } catch (ghnErr: any) {
        console.error("GHN Update Order failed:", ghnErr);
        return {
          ok: false,
          error: `Đồng bộ GHN thất bại: ${ghnErr?.message || "Không thể cập nhật trên GHN Sandbox"}`,
        };
      }
    }

    // 2. Cập nhật DB nội bộ qua API
    const dbPayload = {
      ...(payload.customerName !== undefined ? { customerName: payload.customerName } : {}),
      ...(payload.customerPhone !== undefined ? { customerPhone: payload.customerPhone } : {}),
      ...(payload.customerAddress !== undefined
        ? { customerAddress: payload.customerAddress }
        : {}),
      ...(payload.toDistrictId !== undefined ? { districtId: payload.toDistrictId } : {}),
      ...(payload.toWardCode !== undefined ? { wardCode: payload.toWardCode } : {}),
      ...(payload.note !== undefined ? { note: payload.note } : {}),
    };

    try {
      const targetId = order.id || order.orderCode || orderId;
      const updated = await orderApi.update(targetId, dbPayload);
      const localOrder = mapApiOrder(updated);
      const newOrders = orders.map((o) =>
        o.id === order.id || o.orderCode === order.orderCode ? localOrder : o,
      );
      store.setState({ orders: newOrders });
      return { ok: true, data: localOrder };
    } catch (apiErr) {
      return {
        ok: false,
        error:
          apiErr instanceof Error
            ? apiErr.message
            : "Không thể lưu thông tin đơn hàng vào máy chủ.",
      };
    }
  },
};
