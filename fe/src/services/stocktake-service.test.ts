import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Book } from "@/types";
import { stocktakeService } from "./stocktake-service";
import { store } from "./store";

const book: Book = {
  id: "BK-STOCKTAKE",
  title: "Sách kiểm kê",
  author: "Tác giả",
  category: "Tham khảo",
  purchasePrice: 10,
  sellingPrice: 20,
  stock: 5,
  minStock: 1,
  status: "IN_STOCK",
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.restoreAllMocks();
  store.setState({
    books: [{ ...book }],
    orders: [],
    imports: [],
    exports: [],
    shipments: [],
    movements: [],
    stocktakes: [],
    processedOperationKeys: [],
  });
});

describe("stocktake service", () => {
  it("creates a complete stock snapshot and balances against current stock atomically", () => {
    const created = stocktakeService.create({
      title: "Kiểm kê kệ A",
      auditedBy: "Nhân viên",
      items: [{ bookId: book.id, actualStock: 7, reason: "Dư 2 cuốn" }],
    });
    expect(created.ok).toBe(true);
    expect(created.data).toMatchObject({
      status: "DRAFT",
      totalSystemStock: 5,
      totalActualStock: 7,
      totalDiff: 2,
    });

    store.setState({
      books: [{ ...book, stock: 6 }],
    });
    const balanced = stocktakeService.balance(created.data!.id);
    expect(balanced.data?.status).toBe("BALANCED");
    expect(store.getSnapshot().books[0]?.stock).toBe(7);
    expect(store.getSnapshot().movements[0]).toMatchObject({
      type: "ADJUST",
      beforeStock: 6,
      afterStock: 7,
      quantity: 1,
      referenceCode: created.data!.id,
    });

    const afterFirstBalance = store.getSnapshot();
    expect(stocktakeService.balance(created.data!.id).ok).toBe(true);
    expect(store.getSnapshot()).toBe(afterFirstBalance);
    expect(store.getSnapshot().movements).toHaveLength(1);
  });

  it("rejects incomplete or invalid counts without saving a draft", () => {
    const before = store.getSnapshot();
    expect(
      stocktakeService.create({
        title: "Thiếu sách",
        auditedBy: "Nhân viên",
        items: [],
      }),
    ).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
    expect(
      stocktakeService.create({
        title: "Sai số",
        auditedBy: "Nhân viên",
        items: [{ bookId: book.id, actualStock: 1.5 }],
      }),
    ).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
    expect(store.getSnapshot()).toBe(before);
  });

  it("does not mutate memory when persistence fails", () => {
    const before = store.getSnapshot();
    vi.spyOn(store, "setState").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    const result = stocktakeService.create({
      title: "Kiểm kê lỗi lưu",
      auditedBy: "Nhân viên",
      items: [{ bookId: book.id, actualStock: 5 }],
    });

    expect(result).toMatchObject({ ok: false, code: "PERSISTENCE_ERROR" });
    expect(store.getSnapshot()).toBe(before);
  });
});
