import type { Order, OrderItem, OrderStatus, PaymentStatus } from "@/types";
import { applyStockDeltas, store } from "./store";
import { checkAvailability, validateLines, type Result, type StockLine } from "./inventory-service";

const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

/** Allowed order status transitions (warehouse workflow). */
export const orderTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["SHIPPING", "CANCELLED"],
  SHIPPING: ["DELIVERED", "FAILED"],
  DELIVERED: ["RETURNED"],
  FAILED: ["RETURNED", "SHIPPING"],
  CANCELLED: [],
  RETURNED: [],
};

/** Statuses that release the reserved stock back into the warehouse. */
const RESTOCK_STATUSES: OrderStatus[] = ["CANCELLED", "RETURNED"];


export const orderService = {
  /** Create an order; stock is reserved (decreased) right away. */
  async createOrder(input: {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    shippingMethod: string;
    shippingFee: number;
    discount: number;
    trackingCode?: string;
    note?: string;
    expectedDelivery?: string;
    lines: StockLine[];
  }): Promise<Result<Order>> {
    if (!input.customerName || !input.customerPhone)
      return { ok: false, error: "Vui lòng nhập tên và số điện thoại khách hàng." };
    const invalid = validateLines(input.lines, true);
    if (invalid) return { ok: false, error: invalid };
    const shortage = checkAvailability(input.lines);
    if (shortage) return { ok: false, error: shortage };

    await delay();
    const { orders, shipments, books } = store.getSnapshot();
    const items: OrderItem[] = input.lines.map((l) => ({
      bookId: l.bookId,
      title: books.find((b) => b.id === l.bookId)?.title ?? l.bookId,
      quantity: l.quantity,
      price: l.price,
    }));
    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
    const orderId = `ORD-${2025000 + orders.length + 1}`;
    const order: Order = {
      id: orderId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerAddress: input.customerAddress,
      items,
      subtotal,
      discount: input.discount,
      shippingFee: input.shippingFee,
      total: Math.max(0, subtotal - input.discount + input.shippingFee),
      payment: "UNPAID",
      shippingMethod: input.shippingMethod,
      trackingCode: input.trackingCode,
      note: input.note,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    const newShipments = [...shipments];
    if (input.trackingCode || input.shippingMethod.includes("GHN") || input.shippingMethod.includes("Giao Hàng Nhanh")) {
      newShipments.unshift({
        id: `SHP-${3000 + shipments.length + 1}`,
        orderId,
        customerName: input.customerName,
        carrier: "Giao Hàng Nhanh (GHN)",
        trackingNumber: input.trackingCode || `GHN-${Date.now().toString().slice(-6)}`,
        shippingFee: input.shippingFee,
        expectedDelivery: input.expectedDelivery || new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
        status: "WAITING_PICKUP",
        address: input.customerAddress,
      });
    }

    store.setState({ orders: [order, ...orders], shipments: newShipments });
    applyStockDeltas(
      input.lines.reduce<Record<string, number>>((acc, l) => {
        acc[l.bookId] = (acc[l.bookId] ?? 0) - l.quantity;
        return acc;
      }, {}),
    );
    return { ok: true, data: order };
  },

  /** Move an order through the warehouse workflow, restocking when cancelled/returned. */
  async updateStatus(orderId: string, next: OrderStatus): Promise<Result<Order>> {
    const { orders } = store.getSnapshot();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, error: "Không tìm thấy đơn hàng." };
    if (!orderTransitions[order.status].includes(next))
      return { ok: false, error: "Không thể chuyển sang trạng thái này." };

    await delay(300);
    const shouldRestock =
      RESTOCK_STATUSES.includes(next) && !RESTOCK_STATUSES.includes(order.status);

    const payment: PaymentStatus =
      next === "DELIVERED" && order.payment === "UNPAID"
        ? "PAID"
        : next === "RETURNED" && order.payment === "PAID"
          ? "REFUNDED"
          : order.payment;

    const updated: Order = { ...order, status: next, payment };
    store.setState({ orders: orders.map((o) => (o.id === orderId ? updated : o)) });

    if (shouldRestock) {
      applyStockDeltas(
        order.items.reduce<Record<string, number>>((acc, it) => {
          acc[it.bookId] = (acc[it.bookId] ?? 0) + it.quantity;
          return acc;
        }, {}),
      );
    }
    return { ok: true, data: updated };
  },

  /** Update payment state manually (e.g. cash collected at the counter). */
  async updatePayment(orderId: string, payment: PaymentStatus): Promise<Result<Order>> {
    const { orders } = store.getSnapshot();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, error: "Không tìm thấy đơn hàng." };
    const updated: Order = { ...order, payment };
    store.setState({ orders: orders.map((o) => (o.id === orderId ? updated : o)) });
    return { ok: true, data: updated };
  },
};
