import {
  ORDER_STATUS_TRANSITIONS,
  PAYMENT_STATUS_TRANSITIONS,
  SHIPPING_STATUS_TRANSITIONS,
  type Order,
  type OrderStatus,
  type PaymentStatus,
  type ShippingStatus,
  type StockMovement,
  type Book,
  type Customer,
} from "@/types";
import { checkAvailability, validateLines, type Result, type StockLine } from "./inventory-service";
import { bookStatusOf, nextId, store } from "./store";
import { serviceFailure, serviceSuccess, type ServiceErrorCode } from "./service-result";

export const orderTransitions = ORDER_STATUS_TRANSITIONS;
const RESTOCK_STATUSES: OrderStatus[] = ["CANCELLED", "RETURNED"];

function failure<T>(code: ServiceErrorCode, message: string): Result<T> {
  return serviceFailure(code, message);
}

function buildStockChanges(
  lines: StockLine[],
  sign: 1 | -1,
  date: string,
  referenceCode: string,
  type: StockMovement["type"],
) {
  const { books, movements } = store.getSnapshot();
  const quantities = lines.reduce<Record<string, number>>((acc, line) => {
    acc[line.bookId] = (acc[line.bookId] ?? 0) + line.quantity;
    return acc;
  }, {});
  const updatedBooks: Book[] = books.map((book) => {
    const quantity = quantities[book.id] ?? 0;
    if (!quantity) return book;
    const stock = book.stock + sign * quantity;
    const status: Book["status"] =
      book.status === "DISCONTINUED" ? "DISCONTINUED" : bookStatusOf(stock, book.minStock);
    return {
      ...book,
      stock,
      status,
    };
  });
  let sequence = movements;
  const addedMovements = Object.entries(quantities).map(([bookId, quantity]) => {
    const book = books.find((item) => item.id === bookId)!;
    const beforeStock = book.stock;
    const afterStock = beforeStock + sign * quantity;
    const movement: StockMovement = {
      id: nextId("MOV", sequence),
      bookId,
      bookTitle: book.title,
      type,
      quantity,
      beforeStock,
      afterStock,
      referenceCode,
      createdBy: "DEMO",
      createdAt: date,
    };
    sequence = [...sequence, movement];
    return movement;
  });
  return { books: updatedBooks, movements: [...movements, ...addedMovements] };
}

function updateOrderAndShipment(
  orderId: string,
  next: OrderStatus,
  shipmentOverride?: ShippingStatus,
): Result<Order> {
  const current = store.getSnapshot();
  const order = current.orders.find((item) => item.id === orderId || item.orderCode === orderId);
  if (!order) return failure("NOT_FOUND", "Không tìm thấy đơn hàng.");
  const orderChanged = order.status !== next;
  if (orderChanged && !orderTransitions[order.status].includes(next)) {
    return failure("INVALID_TRANSITION", "Không thể chuyển sang trạng thái này.");
  }

  const targetShipmentStatus =
    shipmentOverride ??
    (next === "DELIVERED"
      ? "DELIVERED"
      : next === "FAILED"
        ? "FAILED"
        : next === "RETURNED"
          ? "RETURNED"
          : next === "CANCELLED"
            ? "CANCELLED"
            : null);
  const linkedShipments = current.shipments.filter((shipment) => shipment.orderId === order.id);
  for (const shipment of linkedShipments) {
    if (
      targetShipmentStatus &&
      shipment.status !== targetShipmentStatus &&
      !SHIPPING_STATUS_TRANSITIONS[shipment.status].includes(targetShipmentStatus)
    ) {
      return failure(
        "INVALID_TRANSITION",
        "Trạng thái vận đơn không cho phép chuyển cùng với đơn hàng.",
      );
    }
  }
  if (
    !orderChanged &&
    linkedShipments.every(
      (shipment) => !targetShipmentStatus || shipment.status === targetShipmentStatus,
    )
  ) {
    return serviceSuccess(order);
  }

  const shouldRestock =
    orderChanged && RESTOCK_STATUSES.includes(next) && !RESTOCK_STATUSES.includes(order.status);
  const date = new Date().toISOString();
  let updatedBooks = current.books;
  let movements = current.movements;
  if (shouldRestock) {
    const stock = buildStockChanges(
      order.items.map((item) => ({
        bookId: item.bookId,
        quantity: item.quantity,
        price: item.price,
      })),
      1,
      date,
      order.orderCode ?? order.id,
      "RESTOCK",
    );
    updatedBooks = stock.books;
    movements = stock.movements;
  }

  const payment =
    next === "DELIVERED" && order.payment === "UNPAID"
      ? "PAID"
      : next === "RETURNED" && order.payment === "PAID"
        ? "REFUNDED"
        : order.payment;
  if (payment !== order.payment && !PAYMENT_STATUS_TRANSITIONS[order.payment].includes(payment)) {
    return failure("INVALID_TRANSITION", "Không thể chuyển trạng thái thanh toán này.");
  }
  const updatedOrder: Order = { ...order, status: next, payment };
  const updatedShipments = current.shipments.map((shipment) =>
    shipment.orderId === order.id && targetShipmentStatus
      ? { ...shipment, status: targetShipmentStatus }
      : shipment,
  );
  try {
    store.setState({
      books: updatedBooks,
      orders: current.orders.map((item) => (item.id === order.id ? updatedOrder : item)),
      shipments: updatedShipments,
      movements,
    });
    return serviceSuccess(updatedOrder);
  } catch (error) {
    return failure(
      "PERSISTENCE_ERROR",
      error instanceof Error ? error.message : "Không thể lưu trạng thái đơn hàng.",
    );
  }
}

export const orderService = {
  async createOrder(input: {
    orderCode?: string;
    customerName: string;
    customerPhone: string;
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
    idempotencyKey?: string;
  }): Promise<Result<Order>> {
    if (!input.customerName.trim() || !/^[+()\d\s.-]{6,20}$/.test(input.customerPhone.trim())) {
      return failure("VALIDATION_ERROR", "Vui lòng nhập tên và số điện thoại khách hàng.");
    }
    if (!input.customerAddress.trim() || !input.shippingMethod.trim()) {
      return failure("VALIDATION_ERROR", "Vui lòng nhập địa chỉ và phương thức giao hàng.");
    }
    if (
      !Number.isFinite(input.shippingFee) ||
      input.shippingFee < 0 ||
      !Number.isFinite(input.discount) ||
      input.discount < 0
    ) {
      return failure("VALIDATION_ERROR", "Phí giao hàng và giảm giá phải là số không âm.");
    }
    const invalid = validateLines(input.lines, true);
    if (invalid) return failure("VALIDATION_ERROR", invalid);
    const shortage = checkAvailability(input.lines);
    if (shortage) {
      const code = shortage.startsWith("Không đủ số lượng") ? "INSUFFICIENT_STOCK" : "NOT_FOUND";
      return failure(code, shortage);
    }
    if (input.idempotencyKey && store.hasProcessedOperation(`order:${input.idempotencyKey}`)) {
      return failure("DUPLICATE_OPERATION", "Thao tác tạo đơn này đã được xử lý.");
    }
    if (input.status && !["PENDING", "DELIVERED"].includes(input.status)) {
      return failure("VALIDATION_ERROR", "Không thể tạo đơn trực tiếp ở trạng thái này.");
    }
    if (input.payment && !["UNPAID", "PAID"].includes(input.payment)) {
      return failure(
        "VALIDATION_ERROR",
        "Không thể tạo đơn trực tiếp ở trạng thái thanh toán này.",
      );
    }

    const { books, orders, shipments, movements, processedOperationKeys, customers } =
      store.getSnapshot();
    const requestedOrderCode = input.orderCode?.trim();
    if (requestedOrderCode && orders.some((order) => order.orderCode === requestedOrderCode)) {
      return failure("CONFLICT", "Mã đơn hàng đã được sử dụng.");
    }
    const isPos =
      input.shippingMethod.toLowerCase().includes("pos") ||
      input.shippingMethod.toLowerCase().includes("quầy") ||
      input.status === "DELIVERED";
    const status: OrderStatus = input.status ?? (isPos ? "DELIVERED" : "PENDING");
    const payment: PaymentStatus = input.payment ?? (isPos ? "PAID" : "UNPAID");
    const id = nextId("ORD", orders);
    const orderCode = requestedOrderCode || id;
    const normalizedPhone = input.customerPhone.replace(/\D/g, "").replace(/^84/, "0");
    const knownCustomer = customers.find(
      (customer) => customer.phone.replace(/\D/g, "").replace(/^84/, "0") === normalizedPhone,
    );
    const customer: Customer =
      knownCustomer ??
      ({
        id: nextId("CUS", customers),
        name: input.customerName.trim(),
        phone: input.customerPhone.trim(),
        address: input.customerAddress.trim(),
      } satisfies Customer);
    const items = input.lines.map((line) => {
      const book = books.find((item) => item.id === line.bookId)!;
      return {
        bookId: book.id,
        title: book.title,
        quantity: line.quantity,
        price: line.price,
        purchasePrice: book.purchasePrice,
      };
    });
    const subtotal = items.reduce((total, item) => total + item.quantity * item.price, 0);
    if (!Number.isFinite(subtotal) || input.discount > subtotal) {
      return failure("VALIDATION_ERROR", "Giảm giá không được vượt quá tổng tiền sản phẩm.");
    }
    const order: Order = {
      id,
      orderCode,
      customerId: customer.id,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      customerAddress: input.customerAddress.trim(),
      ...(input.provinceId !== undefined ? { provinceId: input.provinceId } : {}),
      ...(input.districtId !== undefined ? { districtId: input.districtId } : {}),
      ...(input.wardCode !== undefined ? { wardCode: input.wardCode } : {}),
      items,
      subtotal,
      discount: input.discount,
      shippingFee: input.shippingFee,
      total: subtotal - input.discount + input.shippingFee,
      payment,
      shippingMethod: input.shippingMethod,
      ...(input.trackingCode !== undefined ? { trackingCode: input.trackingCode } : {}),
      status,
      ...(input.note !== undefined ? { note: input.note } : {}),
      createdAt: new Date().toISOString(),
    };
    if (!Number.isFinite(order.total)) {
      return failure("VALIDATION_ERROR", "Tổng tiền đơn hàng vượt giới hạn cho phép.");
    }
    const stock = buildStockChanges(
      input.lines,
      -1,
      order.createdAt,
      orderCode,
      isPos ? "SALE" : "EXPORT",
    );
    const newShipment = {
      id: nextId("SHP", shipments, 3000),
      orderId: order.id,
      customerName: order.customerName,
      carrier: order.shippingMethod,
      trackingNumber: order.trackingCode || `DEMO-${id}`,
      shippingFee: order.shippingFee,
      expectedDelivery: input.expectedDelivery ?? order.createdAt,
      status: status === "DELIVERED" ? ("DELIVERED" as const) : ("WAITING_PICKUP" as const),
      address: order.customerAddress,
    };
    const updatedCustomers: Customer[] = knownCustomer ? customers : [customer, ...customers];

    try {
      store.setState({
        books: stock.books,
        orders: [order, ...orders],
        shipments: [newShipment, ...shipments],
        movements: [...movements, ...stock.movements.slice(movements.length)],
        customers: updatedCustomers,
        ...(input.idempotencyKey
          ? { processedOperationKeys: [...processedOperationKeys, `order:${input.idempotencyKey}`] }
          : {}),
      });
      return serviceSuccess(order);
    } catch (error) {
      return failure(
        "PERSISTENCE_ERROR",
        error instanceof Error ? error.message : "Không thể lưu đơn hàng demo.",
      );
    }
  },

  async updateStatus(orderId: string, next: OrderStatus): Promise<Result<Order>> {
    return updateOrderAndShipment(orderId, next);
  },

  updateFromShipment(
    orderId: string,
    orderStatus: OrderStatus,
    shipmentStatus: ShippingStatus,
  ): Result<Order> {
    return updateOrderAndShipment(orderId, orderStatus, shipmentStatus);
  },

  async updatePayment(orderId: string, payment: PaymentStatus): Promise<Result<Order>> {
    const current = store.getSnapshot();
    const order = current.orders.find((item) => item.id === orderId || item.orderCode === orderId);
    if (!order) return failure("NOT_FOUND", "Không tìm thấy đơn hàng.");
    if (order.payment === payment) return serviceSuccess(order);
    if (!PAYMENT_STATUS_TRANSITIONS[order.payment].includes(payment)) {
      return failure("INVALID_TRANSITION", "Không thể chuyển sang trạng thái thanh toán này.");
    }
    const updatedOrder = { ...order, payment };
    try {
      store.setState({
        orders: current.orders.map((item) => (item.id === order.id ? updatedOrder : item)),
      });
      return serviceSuccess(updatedOrder);
    } catch (error) {
      return failure(
        "PERSISTENCE_ERROR",
        error instanceof Error ? error.message : "Không thể lưu trạng thái thanh toán.",
      );
    }
  },

  async updateOrderInfo(
    orderId: string,
    payload: {
      customerName?: string;
      customerPhone?: string;
      customerAddress?: string;
      note?: string;
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
    const current = store.getSnapshot();
    const order = current.orders.find((item) => item.id === orderId || item.orderCode === orderId);
    if (!order) return failure("NOT_FOUND", "Không tìm thấy đơn hàng trong hệ thống.");
    if (order.status !== "PENDING") {
      return failure("CONFLICT", "Chỉ được sửa đơn hàng ở trạng thái Chờ xử lý.");
    }
    if (
      (payload.customerName !== undefined && !payload.customerName.trim()) ||
      (payload.customerPhone !== undefined && !payload.customerPhone.trim()) ||
      (payload.customerAddress !== undefined && !payload.customerAddress.trim())
    ) {
      return failure("VALIDATION_ERROR", "Thông tin khách hàng không được để trống.");
    }
    if (ghnTrackingCode) {
      try {
        const { ghnApi } = await import("@/lib/ghn-api");
        await ghnApi.updateOrder({
          order_code: ghnTrackingCode,
          ...(payload.customerName !== undefined ? { to_name: payload.customerName } : {}),
          ...(payload.customerPhone !== undefined ? { to_phone: payload.customerPhone } : {}),
          ...(payload.customerAddress !== undefined ? { to_address: payload.customerAddress } : {}),
          ...(payload.toWardCode !== undefined ? { to_ward_code: payload.toWardCode } : {}),
          ...(payload.toDistrictId !== undefined
            ? { to_district_id: Number(payload.toDistrictId) }
            : {}),
          ...(payload.codAmount !== undefined ? { cod_amount: payload.codAmount } : {}),
          ...(payload.weight !== undefined ? { weight: payload.weight } : {}),
          ...(payload.length !== undefined ? { length: payload.length } : {}),
          ...(payload.width !== undefined ? { width: payload.width } : {}),
          ...(payload.height !== undefined ? { height: payload.height } : {}),
          ...(payload.insuranceValue !== undefined
            ? { insurance_value: payload.insuranceValue }
            : {}),
          ...(payload.paymentTypeId !== undefined
            ? { payment_type_id: payload.paymentTypeId }
            : {}),
          ...(payload.requiredNote !== undefined ? { required_note: payload.requiredNote } : {}),
          ...(payload.content !== undefined ? { content: payload.content } : {}),
          ...(payload.note !== undefined ? { note: payload.note } : {}),
        });
      } catch (error) {
        return failure(
          "CONFLICT",
          `Đồng bộ GHN thất bại: ${error instanceof Error ? error.message : "Không thể cập nhật trên GHN Sandbox"}`,
        );
      }
    }
    const updatedOrder: Order = {
      ...order,
      ...(payload.customerName !== undefined ? { customerName: payload.customerName.trim() } : {}),
      ...(payload.customerPhone !== undefined
        ? { customerPhone: payload.customerPhone.trim() }
        : {}),
      ...(payload.customerAddress !== undefined
        ? { customerAddress: payload.customerAddress.trim() }
        : {}),
      ...(payload.note !== undefined ? { note: payload.note } : {}),
      ...(payload.toWardCode !== undefined ? { wardCode: payload.toWardCode } : {}),
      ...(payload.toDistrictId !== undefined ? { districtId: payload.toDistrictId } : {}),
    };
    try {
      store.setState({
        orders: current.orders.map((item) => (item.id === order.id ? updatedOrder : item)),
      });
      return serviceSuccess(updatedOrder);
    } catch (error) {
      return failure(
        "PERSISTENCE_ERROR",
        error instanceof Error ? error.message : "Không thể lưu thông tin đơn hàng.",
      );
    }
  },
};
