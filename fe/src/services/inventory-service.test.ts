import { beforeEach, describe, expect, it, vi } from "vitest";
import { orderApi } from "@/lib/order-api";
import { inventoryApi } from "@/lib/inventory-api";
import { store } from "./store";
import { inventoryService, checkAvailability, validateLines } from "./inventory-service";
import { orderService } from "./order-service";
import type { Book, Order } from "@/types";

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
  store.setState({
    books: testBooks.map((b) => ({ ...b })),
    orders: [],
    imports: [],
    exports: [],
    shipments: [],
  });
  vi.restoreAllMocks();
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
    vi.spyOn(inventoryApi, "createImport").mockResolvedValue({
      id: 1,
      receiptCode: "IMP-1001",
      supplierName: "NXB Trẻ",
      importDate: new Date().toISOString(),
      totalItems: 10,
      totalValue: 500000,
      items: [],
      createdAt: new Date().toISOString(),
    });

    const res = await inventoryService.createImport({
      supplier: "NXB Trẻ",
      date: new Date().toISOString(),
      lines: [{ bookId: before.id, quantity: 10, price: 50000 }],
    });
    expect(res.ok).toBe(true);
    expect(firstBook().stock).toBe(before.stock + 10);
    expect(store.getSnapshot().imports[0]?.totalValue).toBe(500000);
  });

  it("không giả lập nhập kho thành công khi API lỗi", async () => {
    const before = firstBook();
    vi.spyOn(inventoryApi, "createImport").mockRejectedValue(new Error("API unavailable"));

    const res = await inventoryService.createImport({
      supplier: "NXB Trẻ",
      date: new Date().toISOString(),
      lines: [{ bookId: before.id, quantity: 10, price: 50000 }],
    });

    expect(res.ok).toBe(false);
    expect(res.error).toBe("API unavailable");
    expect(firstBook().stock).toBe(before.stock);
    expect(store.getSnapshot().imports).toHaveLength(0);
  });

  it("không giả lập nhập kho thành công khi API lỗi", async () => {
    const before = firstBook();
    vi.spyOn(inventoryApi, "createImport").mockRejectedValue(new Error("API unavailable"));

    const res = await inventoryService.createImport({
      supplier: "NXB Trẻ",
      date: new Date().toISOString(),
      lines: [{ bookId: before.id, quantity: 10, price: 50000 }],
    });

    expect(res.ok).toBe(false);
    expect(res.error).toBe("API unavailable");
    expect(firstBook().stock).toBe(before.stock);
    expect(store.getSnapshot().imports).toHaveLength(0);
  });

  it("xuất kho làm giảm tồn kho", async () => {
    const before = firstBook();
    vi.spyOn(inventoryApi, "createExport").mockResolvedValue({
      id: 1,
      receiptCode: "EXP-2001",
      reason: "Bán lẻ",
      exportDate: new Date().toISOString(),
      totalItems: 2,
      createdAt: new Date().toISOString(),
      items: [],
    });

    const res = await inventoryService.createExport({
      reason: "Bán lẻ",
      lines: [{ bookId: before.id, quantity: 2, price: 0 }],
    });
    expect(res.ok).toBe(true);
    expect(firstBook().stock).toBe(before.stock - 2);
  });

  it("không giả lập xuất kho thành công khi API lỗi", async () => {
    const before = firstBook();
    vi.spyOn(inventoryApi, "createExport").mockRejectedValue(new Error("API unavailable"));

    const res = await inventoryService.createExport({
      reason: "Bán lẻ",
      lines: [{ bookId: before.id, quantity: 2, price: 0 }],
    });

    expect(res.ok).toBe(false);
    expect(res.error).toBe("API unavailable");
    expect(firstBook().stock).toBe(before.stock);
    expect(store.getSnapshot().exports).toHaveLength(0);
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
  it("POS không báo bán thành công nếu đơn không lưu được trên server", async () => {
    const before = firstBook();
    vi.spyOn(orderApi, "create").mockRejectedValue(new Error("API unavailable"));

    const res = await orderService.createOrder({
      customerName: "Khách lẻ tại quầy",
      customerPhone: "0900000000",
      customerAddress: "Tại quầy",
      shippingMethod: "Bán tại quầy (POS)",
      shippingFee: 0,
      discount: 0,
      lines: [{ bookId: before.id, quantity: 2, price: 300000 }],
    });

    expect(res.ok).toBe(false);
    expect(res.error).toBe("API unavailable");
    expect(firstBook().stock).toBe(before.stock);
    expect(store.getSnapshot().orders).toHaveLength(0);
  });

  it("tạo đơn hàng và trừ tồn kho", async () => {
    const before = firstBook();
    vi.spyOn(orderApi, "create").mockResolvedValue({
      id: 1,
      orderCode: "ORD-1",
      customerName: "Nguyễn A",
      customerPhone: "0900000000",
      customerAddress: "Hà Nội",
      items: [{ bookId: before.id, title: before.title, quantity: 3, price: 100000 }],
      subtotal: 300000,
      discount: 10000,
      shippingFee: 20000,
      total: 310000,
      payment: "UNPAID",
      shippingMethod: "STANDARD",
      status: "PENDING",
      createdAt: new Date().toISOString(),
    });

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

  it("không cập nhật trạng thái hoặc hoàn tồn cục bộ nếu API từ chối hủy đơn", async () => {
    const book = firstBook();
    const order: Order = {
      id: "7",
      orderCode: "ORD-7",
      customerName: "Nguyễn A",
      customerPhone: "0900000000",
      customerAddress: "Hà Nội",
      items: [{ bookId: book.id, title: book.title, quantity: 3, price: 100000 }],
      subtotal: 300000,
      discount: 0,
      shippingFee: 0,
      total: 300000,
      payment: "UNPAID",
      shippingMethod: "STANDARD",
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    store.setState({ orders: [order] });
    vi.spyOn(orderApi, "updateStatus").mockRejectedValue(new Error("API unavailable"));

    const res = await orderService.updateStatus(order.id, "CANCELLED");

    expect(res.ok).toBe(false);
    expect(res.error).toBe("API unavailable");
    expect(store.getSnapshot().orders[0]?.status).toBe("PENDING");
    expect(firstBook().stock).toBe(book.stock);
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
