import { beforeEach, describe, expect, it } from "vitest";
import { store } from "./store";
import { inventoryService, checkAvailability, validateLines } from "./inventory-service";
import { orderService } from "./order-service";
import type { Book } from "@/types";

const testBooks: Book[] = [
  {
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
  },
];

const firstBook = () => store.getSnapshot().books[0]!;

beforeEach(() => {
  store.setState({ books: testBooks.map((b) => ({ ...b })) });
});

describe("validateLines", () => {
  it("từ chối danh sách rỗng", () => {
    expect(validateLines([], true)).toBeTruthy();
  });

  it("từ chối số lượng <= 0", () => {
    expect(validateLines([{ bookId: "B-1", quantity: 0, price: 100 }], true)).toBeTruthy();
  });

  it("chấp nhận dòng hợp lệ", () => {
    expect(validateLines([{ bookId: "B-1", quantity: 2, price: 100 }], true)).toBeNull();
  });
});

describe("checkAvailability", () => {
  it("báo lỗi khi vượt tồn kho", () => {
    const b = firstBook();
    expect(checkAvailability([{ bookId: b.id, quantity: b.stock + 5, price: 0 }])).toBeTruthy();
  });

  it("hợp lệ khi trong tồn kho", () => {
    const b = firstBook();
    expect(checkAvailability([{ bookId: b.id, quantity: 1, price: 0 }])).toBeNull();
  });
});

describe("inventoryService", () => {
  it("nhập kho làm tăng tồn kho và tạo phiếu", async () => {
    const before = firstBook();
    const res = await inventoryService.createImport({
      supplier: "NXB Trẻ",
      date: new Date().toISOString(),
      lines: [{ bookId: before.id, quantity: 10, price: 50000 }],
    });
    expect(res.ok).toBe(true);
    expect(firstBook().stock).toBe(before.stock + 10);
    expect(store.getSnapshot().imports[0]?.totalValue).toBe(500000);
  });

  it("xuất kho làm giảm tồn kho", async () => {
    const before = firstBook();
    const res = await inventoryService.createExport({
      reason: "Bán lẻ",
      lines: [{ bookId: before.id, quantity: 2, price: 0 }],
    });
    expect(res.ok).toBe(true);
    expect(firstBook().stock).toBe(before.stock - 2);
  });

  it("chặn xuất kho vượt tồn", async () => {
    const before = firstBook();
    const res = await inventoryService.createExport({
      reason: "Bán lẻ",
      lines: [{ bookId: before.id, quantity: before.stock + 1, price: 0 }],
    });
    expect(res.ok).toBe(false);
    expect(firstBook().stock).toBe(before.stock);
  });
});

describe("orderService", () => {
  it("tạo đơn hàng và trừ tồn kho", async () => {
    const before = firstBook();
    const res = await orderService.createOrder({
      customerName: "Nguyễn A",
      customerPhone: "0900000000",
      customerAddress: "Hà Nội",
      shippingMethod: "STANDARD",
      shippingFee: 20000,
      discount: 10000,
      lines: [{ bookId: before.id, quantity: 3, price: 100000 }],
    });
    expect(res.ok).toBe(true);
    expect(res.data?.total).toBe(3 * 100000 - 10000 + 20000);
    expect(firstBook().stock).toBe(before.stock - 3);
  });

  it("yêu cầu thông tin khách hàng", async () => {
    const res = await orderService.createOrder({
      customerName: "",
      customerPhone: "",
      customerAddress: "",
      shippingMethod: "STANDARD",
      shippingFee: 0,
      discount: 0,
      lines: [],
    });
    expect(res.ok).toBe(false);
  });
});
