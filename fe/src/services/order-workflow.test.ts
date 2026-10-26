import { beforeEach, describe, expect, it, vi } from "vitest";
import { orderService, orderTransitions } from "./order-service";
import { store } from "./store";
import type { Book, Order } from "@/types";
import { orderApi } from "@/lib/order-api";

const book: Book = {
  id: "1",
  title: "Clean Code",
  author: "Robert C. Martin",
  category: "Công nghệ",
  purchasePrice: 200000,
  sellingPrice: 300000,
  stock: 20,
  minStock: 5,
  status: "IN_STOCK",
  createdAt: new Date().toISOString(),
};

const order: Order = {
  id: "1",
  orderCode: "ORD-TEST-1",
  customerName: "K",
  customerPhone: "0900000000",
  customerAddress: "A",
  items: [{ bookId: book.id, title: book.title, quantity: 3, price: book.sellingPrice }],
  subtotal: book.sellingPrice * 3,
  discount: 0,
  shippingFee: 0,
  total: book.sellingPrice * 3,
  payment: "UNPAID",
  shippingMethod: "GHTK",
  status: "PENDING",
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  store.setState({
    orders: [{ ...order }],
    books: [{ ...book }],
  });
  vi.restoreAllMocks();
});

describe("order workflow", () => {
  it("chỉ cho phép chuyển trạng thái hợp lệ", async () => {
    const invalid = await orderService.updateStatus(order.id, "DELIVERED");
    expect(invalid.ok).toBe(false);
    expect(orderTransitions.PENDING).toContain("CONFIRMED");
  });

  it("hủy đơn thì hoàn lại tồn kho", async () => {
    const before = store.getSnapshot().books.find((b) => b.id === book.id)!.stock;
    vi.spyOn(orderApi, "updateStatus").mockResolvedValue({
      id: 1,
      orderCode: order.orderCode!,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      items: order.items,
      subtotal: order.subtotal,
      discount: order.discount,
      shippingFee: order.shippingFee,
      total: order.total,
      payment: order.payment,
      shippingMethod: order.shippingMethod,
      status: "CANCELLED",
      createdAt: order.createdAt,
    });

    const res = await orderService.updateStatus(order.id, "CANCELLED");
    expect(res.ok).toBe(true);
    const after = store.getSnapshot().books.find((b) => b.id === book.id)!.stock;
    expect(after).toBe(before + 3);
  });

  it("giao thành công thì ghi nhận đã thanh toán", async () => {
    const statusApi = vi.spyOn(orderApi, "updateStatus");
    statusApi.mockImplementation(async (_id, status) => ({
      id: 1,
      orderCode: order.orderCode!,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      items: order.items,
      subtotal: order.subtotal,
      discount: order.discount,
      shippingFee: order.shippingFee,
      total: order.total,
      payment: status === "DELIVERED" ? "PAID" : "UNPAID",
      shippingMethod: order.shippingMethod,
      status: status as
        "PENDING" | "CONFIRMED" | "PREPARING" | "SHIPPING" | "DELIVERED" | "CANCELLED" | "RETURNED",
      createdAt: order.createdAt,
    }));

    await orderService.updateStatus(order.id, "CONFIRMED");
    await orderService.updateStatus(order.id, "PREPARING");
    await orderService.updateStatus(order.id, "SHIPPING");
    const res = await orderService.updateStatus(order.id, "DELIVERED");
    expect(res.data?.payment).toBe("PAID");
  });
});
