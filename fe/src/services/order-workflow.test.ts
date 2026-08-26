import { beforeEach, describe, expect, it } from "vitest";
import { orderService, orderTransitions } from "./order-service";
import { store } from "./store";
import type { Book, Order } from "@/types";

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
  id: "ORD-TEST-1",
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
});

describe("order workflow", () => {
  it("chỉ cho phép chuyển trạng thái hợp lệ", async () => {
    const invalid = await orderService.updateStatus(order.id, "DELIVERED");
    expect(invalid.ok).toBe(false);
    expect(orderTransitions.PENDING).toContain("CONFIRMED");
  });

  it("hủy đơn thì hoàn lại tồn kho", async () => {
    const before = store.getSnapshot().books.find((b) => b.id === book.id)!.stock;
    const res = await orderService.updateStatus(order.id, "CANCELLED");
    expect(res.ok).toBe(true);
    const after = store.getSnapshot().books.find((b) => b.id === book.id)!.stock;
    expect(after).toBe(before + 3);
  });

  it("giao thành công thì ghi nhận đã thanh toán", async () => {
    await orderService.updateStatus(order.id, "CONFIRMED");
    await orderService.updateStatus(order.id, "PREPARING");
    await orderService.updateStatus(order.id, "SHIPPING");
    const res = await orderService.updateStatus(order.id, "DELIVERED");
    expect(res.data?.payment).toBe("PAID");
  });
});
