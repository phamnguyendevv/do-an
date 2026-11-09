import { beforeEach, describe, expect, it, vi } from "vitest";
import { store } from "./store";
import { inventoryService, checkAvailability, validateLines } from "./inventory-service";
import { orderService } from "./order-service";
import type { Book } from "@/types";

const testBook: Book = {
  id: "BK-TEST",
  title: "Clean Code",
  author: "Robert C. Martin",
  category: "Công nghệ",
  purchasePrice: 200_000,
  sellingPrice: 300_000,
  stock: 20,
  minStock: 5,
  status: "IN_STOCK",
  createdAt: new Date().toISOString(),
};

const firstBook = () => store.getSnapshot().books[0]!;

beforeEach(() => {
  vi.restoreAllMocks();
  store.setState({
    books: [{ ...testBook }],
    orders: [],
    imports: [],
    exports: [],
    shipments: [],
    movements: [],
    stocktakes: [],
    customers: [],
    processedOperationKeys: [],
  });
});

describe("inventory validation", () => {
  it("rejects empty lines, non-positive quantities, duplicate books, and invalid prices", () => {
    expect(validateLines([], true)).toBeTruthy();
    expect(validateLines([{ bookId: "BK-TEST", quantity: 0, price: 10 }], true)).toBeTruthy();
    expect(
      validateLines(
        [
          { bookId: "BK-TEST", quantity: 1, price: 10 },
          { bookId: "BK-TEST", quantity: 1, price: 10 },
        ],
        true,
      ),
    ).toBeTruthy();
    expect(
      validateLines([{ bookId: "BK-TEST", quantity: 1, price: Number.NaN }], true),
    ).toBeTruthy();
  });

  it("does not accept an unknown book as available", () => {
    expect(checkAvailability([{ bookId: "missing", quantity: 1, price: 0 }])).toContain(
      "Không tìm thấy",
    );
  });
});

describe("inventory service", () => {
  it("creates an import, updates stock, and records line and movement snapshots atomically", async () => {
    const result = await inventoryService.createImport({
      supplier: "NXB Trẻ",
      date: new Date().toISOString(),
      lines: [{ bookId: testBook.id, quantity: 10, price: 50_000 }],
    });

    expect(result.ok).toBe(true);
    expect(firstBook().stock).toBe(testBook.stock + 10);
    expect(store.getSnapshot().imports[0]?.items?.[0]?.title).toBe(testBook.title);
    expect(store.getSnapshot().imports[0]?.totalValue).toBe(500_000);
    expect(store.getSnapshot().movements).toHaveLength(1);
  });

  it("creates an export only when stock is sufficient", async () => {
    const result = await inventoryService.createExport({
      reason: "Bán lẻ",
      lines: [{ bookId: testBook.id, quantity: 2, price: 0 }],
    });

    expect(result.ok).toBe(true);
    expect(firstBook().stock).toBe(testBook.stock - 2);
    expect(store.getSnapshot().exports).toHaveLength(1);
    expect(store.getSnapshot().movements[0]?.type).toBe("EXPORT");
  });

  it("rejects shortage and does not partially mutate any collection", async () => {
    const before = store.getSnapshot();
    const result = await inventoryService.createExport({
      reason: "Bán lẻ",
      lines: [{ bookId: testBook.id, quantity: testBook.stock + 1, price: 0 }],
    });

    expect(result).toMatchObject({ ok: false, code: "INSUFFICIENT_STOCK" });
    expect(store.getSnapshot()).toBe(before);
  });

  it("rejects repeat submissions with a reused idempotency key", async () => {
    const input = {
      supplier: "NXB Trẻ",
      date: new Date().toISOString(),
      lines: [{ bookId: testBook.id, quantity: 2, price: 10 }],
      idempotencyKey: "import-form-1",
    };
    const first = await inventoryService.createImport(input);
    const second = await inventoryService.createImport(input);

    expect(first.ok).toBe(true);
    expect(second).toMatchObject({ ok: false, code: "DUPLICATE_OPERATION" });
    expect(firstBook().stock).toBe(testBook.stock + 2);
    expect(store.getSnapshot().imports).toHaveLength(1);
  });

  it("leaves all memory unchanged if persistence fails", async () => {
    const before = store.getSnapshot();
    vi.spyOn(store, "setState").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    const result = await inventoryService.createImport({
      supplier: "NXB Trẻ",
      date: new Date().toISOString(),
      lines: [{ bookId: testBook.id, quantity: 2, price: 10 }],
    });

    expect(result).toMatchObject({ ok: false, code: "PERSISTENCE_ERROR" });
    expect(store.getSnapshot()).toBe(before);
  });

  it("creates an order and prevents stock from being restored twice", async () => {
    const created = await orderService.createOrder({
      customerName: "Khách demo",
      customerPhone: "0900000000",
      customerAddress: "Hà Nội",
      shippingMethod: "STANDARD",
      shippingFee: 0,
      discount: 0,
      lines: [{ bookId: testBook.id, quantity: 3, price: 100_000 }],
    });
    expect(created.ok).toBe(true);
    expect(firstBook().stock).toBe(testBook.stock - 3);

    const cancel = await orderService.updateStatus(created.data!.id, "CANCELLED");
    const secondCancel = await orderService.updateStatus(created.data!.id, "CANCELLED");
    expect(cancel.ok).toBe(true);
    expect(secondCancel.ok).toBe(true);
    expect(firstBook().stock).toBe(testBook.stock);
    expect(
      store.getSnapshot().movements.filter((movement) => movement.type === "RESTOCK"),
    ).toHaveLength(1);
    expect(store.getSnapshot().customers).toHaveLength(1);

    await orderService.createOrder({
      customerName: "Khách demo",
      customerPhone: "0900000000",
      customerAddress: "Hà Nội",
      shippingMethod: "STANDARD",
      shippingFee: 0,
      discount: 0,
      lines: [{ bookId: testBook.id, quantity: 1, price: 100_000 }],
    });
    expect(store.getSnapshot().customers).toHaveLength(1);
  });

  it("records order-linked exports without decrementing stock a second time", async () => {
    const order = await orderService.createOrder({
      orderCode: "LOCAL-ORDER-1",
      customerName: "Khách demo",
      customerPhone: "0911111111",
      customerAddress: "Hà Nội",
      shippingMethod: "STANDARD",
      shippingFee: 0,
      discount: 0,
      lines: [{ bookId: testBook.id, quantity: 3, price: 100_000 }],
    });
    const stockAfterOrder = firstBook().stock;
    const movementsAfterOrder = store.getSnapshot().movements.length;
    const input = {
      orderId: order.data!.id,
      reason: "Xuất bán theo đơn",
      lines: [{ bookId: testBook.id, quantity: 3, price: 100_000 }],
    };

    const receipt = await inventoryService.createExport(input);
    const duplicateReceipt = await inventoryService.createExport(input);

    expect(receipt.ok).toBe(true);
    expect(duplicateReceipt).toMatchObject({ ok: false, code: "CONFLICT" });
    expect(firstBook().stock).toBe(stockAfterOrder);
    expect(store.getSnapshot().movements).toHaveLength(movementsAfterOrder);
  });

  it("rejects duplicate order codes and repeated order submissions", async () => {
    const input = {
      orderCode: "LOCAL-IDEMPOTENT-1",
      customerName: "Khách demo",
      customerPhone: "0922222222",
      customerAddress: "Hà Nội",
      shippingMethod: "POS",
      shippingFee: 0,
      discount: 0,
      lines: [{ bookId: testBook.id, quantity: 1, price: 100_000 }],
      idempotencyKey: "pos-submit-1",
    };
    const first = await orderService.createOrder(input);
    const replay = await orderService.createOrder(input);
    const reusedCode = await orderService.createOrder({
      ...input,
      idempotencyKey: "different-key",
    });

    expect(first.ok).toBe(true);
    expect(replay).toMatchObject({ ok: false, code: "DUPLICATE_OPERATION" });
    expect(reusedCode).toMatchObject({ ok: false, code: "CONFLICT" });
    expect(store.getSnapshot().orders).toHaveLength(1);
    expect(firstBook().stock).toBe(testBook.stock - 1);
  });
});
