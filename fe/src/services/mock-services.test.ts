import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Book, Order } from "@/types";
import { booksService } from "./books-service";
import {
  categoryService,
  customerService,
  publisherService,
  supplierService,
  userService,
} from "./directory-service";
import { shippingService } from "./shipping-service";
import { store } from "./store";

const book: Book = {
  id: "BK-1",
  title: "Sách mẫu",
  author: "Tác giả",
  category: "Văn học & Tiểu thuyết",
  publisher: "NXB Trẻ",
  purchasePrice: 40_000,
  sellingPrice: 80_000,
  stock: 5,
  minStock: 2,
  status: "IN_STOCK",
  createdAt: new Date().toISOString(),
};

const order: Order = {
  id: "ORD-1",
  customerName: "Khách hàng",
  customerPhone: "0900000000",
  customerAddress: "Địa chỉ",
  items: [{ bookId: book.id, title: book.title, quantity: 1, price: 80_000 }],
  subtotal: 80_000,
  discount: 0,
  shippingFee: 10_000,
  total: 90_000,
  payment: "UNPAID",
  shippingMethod: "GHN",
  status: "PENDING",
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.restoreAllMocks();
  store.setState({
    books: [{ ...book }],
    orders: [{ ...order }],
    imports: [],
    exports: [],
    shipments: [],
    movements: [],
    categories: [],
    publishers: [],
    suppliers: [],
    customers: [],
    users: [],
    processedOperationKeys: [],
    stocktakes: [],
  });
});

describe("books service", () => {
  it("creates, reads, updates, and deletes an unreferenced book", () => {
    const created = booksService.create({
      title: "Sách mới",
      author: "Tác giả",
      category: "Văn học",
      purchasePrice: 10,
      sellingPrice: 20,
      minStock: 0,
    });
    expect(created.ok).toBe(true);
    expect(booksService.get(created.data!.id).data?.stock).toBe(0);

    const updated = booksService.update(created.data!.id, { sellingPrice: 30 });
    expect(updated.data?.sellingPrice).toBe(30);
    expect(booksService.delete(created.data!.id).ok).toBe(true);
  });

  it("validates prices and duplicates and protects historical references", () => {
    expect(
      booksService.create({
        title: "Sai",
        author: "Tác giả",
        category: "Văn học",
        purchasePrice: -1,
        sellingPrice: 20,
        minStock: 0,
      }),
    ).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
    const openingBook = booksService.create({
      title: "Có tồn",
      author: "Tác giả",
      category: "Văn học",
      purchasePrice: 10,
      sellingPrice: 20,
      minStock: 0,
      stock: 5,
    });
    expect(openingBook.ok).toBe(true);
    expect(store.getSnapshot().movements[0]).toMatchObject({
      bookId: openingBook.data?.id,
      type: "IMPORT",
      quantity: 5,
    });
    expect(booksService.delete(book.id)).toMatchObject({ ok: false, code: "CONFLICT" });
  });

  it("imports a batch atomically with opening receipts, movements, references, and idempotency", () => {
    const inputs = [
      {
        title: "Batch 1",
        author: "Tác giả",
        category: "Lịch sử",
        purchasePrice: 10,
        sellingPrice: 20,
        stock: 3,
        minStock: 1,
        isbn: "978-1",
      },
      {
        title: "Batch 2",
        author: "Tác giả",
        category: "Lịch sử",
        purchasePrice: 15,
        sellingPrice: 25,
        stock: 2,
        minStock: 0,
        isbn: "978-2",
      },
    ];
    const result = booksService.createMany(inputs, "excel-file-1");
    expect(result.data).toHaveLength(2);
    expect(store.getSnapshot().imports[0]).toMatchObject({
      supplier: "Nhập danh mục Excel",
      totalItems: 5,
      totalValue: 60,
      items: expect.arrayContaining([
        expect.objectContaining({ title: "Batch 1", quantity: 3 }),
        expect.objectContaining({ title: "Batch 2", quantity: 2 }),
      ]),
    });
    expect(store.getSnapshot().movements).toHaveLength(2);
    expect(store.getSnapshot().categories.filter((item) => item.name === "Lịch sử")).toHaveLength(
      1,
    );
    const before = store.getSnapshot();
    expect(booksService.createMany(inputs, "excel-file-1")).toMatchObject({
      ok: false,
      code: "DUPLICATE_OPERATION",
    });
    expect(store.getSnapshot()).toBe(before);
  });

  it("rejects an invalid batch without creating any records", () => {
    const before = store.getSnapshot();
    const result = booksService.createMany([
      {
        title: "Batch",
        author: "Tác giả",
        category: "Lịch sử",
        purchasePrice: 10,
        sellingPrice: 20,
        stock: 1,
        minStock: 0,
        isbn: "same",
      },
      {
        title: "Batch duplicate",
        author: "Tác giả",
        category: "Lịch sử",
        purchasePrice: 10,
        sellingPrice: 20,
        stock: 1,
        minStock: 0,
        isbn: "same",
      },
    ]);
    expect(result).toMatchObject({ ok: false, code: "CONFLICT" });
    expect(store.getSnapshot()).toBe(before);
  });

  it("surfaces persistence errors without mutating state", () => {
    const before = store.getSnapshot();
    vi.spyOn(store, "setState").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    const result = booksService.update(book.id, { title: "Không lưu" });
    expect(result).toMatchObject({ ok: false, code: "PERSISTENCE_ERROR" });
    expect(store.getSnapshot()).toBe(before);
  });
});

describe("directory services", () => {
  it("supports validated CRUD for categories, publishers, suppliers, customers, and demo users", () => {
    const category = categoryService.create({ name: "Khoa học" });
    expect(category.ok).toBe(true);
    expect(categoryService.update(category.data!.id, { description: "Mô tả" }).ok).toBe(true);
    expect(categoryService.create({ name: " khoa học " })).toMatchObject({
      ok: false,
      code: "CONFLICT",
    });

    const publisher = publisherService.create({ name: "NXB Mới" });
    expect(publisher.data?.name).toBe("NXB Mới");

    const supplier = supplierService.create({ name: "Nhà cung cấp A", phone: "0900000000" });
    expect(supplier.ok).toBe(true);
    expect(supplierService.create({ name: "Sai", email: "khong-hop-le" })).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });

    const customer = customerService.create({ name: "Khách A", phone: "0911111111" });
    expect(customer.ok).toBe(true);
    expect(customerService.create({ name: "Khách trùng", phone: "+84 911 111 111" })).toMatchObject(
      { ok: false, code: "CONFLICT" },
    );
    expect(customerService.update(customer.data!.id, { email: "khach@example.com" }).ok).toBe(true);

    const user = userService.create({
      name: "Nhân viên",
      email: "staff@example.com",
      role: "STAFF",
      active: true,
    });
    expect(user.ok).toBe(true);
    expect(userService.update(user.data!.id, { active: false }).data?.active).toBe(false);
  });

  it("keeps book category snapshots consistent when a referenced category is renamed", () => {
    store.setState({ categories: [{ id: "CAT-1", name: book.category }] });
    const updated = categoryService.update("CAT-1", { name: "Lịch sử" });
    expect(updated.ok).toBe(true);
    expect(store.getSnapshot().books[0]?.category).toBe("Lịch sử");
    expect(store.getSnapshot().books[0]?.categoryId).toBe("CAT-1");
  });

  it("prevents deleting categories, publishers, and suppliers still used by records", () => {
    store.setState({
      categories: [{ id: "CAT-1", name: book.category }],
      publishers: [{ id: "PUB-1", name: book.publisher! }],
      suppliers: [{ id: "SUP-1", name: "NXB Trẻ" }],
      imports: [
        {
          id: "IMP-1",
          supplier: "NXB Trẻ",
          supplierId: "SUP-1",
          date: new Date().toISOString(),
          totalItems: 1,
          totalValue: 1,
        },
      ],
    });
    store.setState({
      books: [{ ...book, category: book.category, publisher: book.publisher }],
    });
    expect(categoryService.delete("CAT-1")).toMatchObject({ ok: false, code: "CONFLICT" });
    expect(publisherService.delete("PUB-1")).toMatchObject({ ok: false, code: "CONFLICT" });
    expect(supplierService.delete("SUP-1")).toMatchObject({ ok: false, code: "CONFLICT" });
  });
});

describe("shipping service", () => {
  it("creates a single shipment for an existing order and validates transitions", () => {
    store.setState({ orders: [{ ...order, status: "PREPARING" }] });
    const created = shippingService.create({
      orderId: order.id,
      customerName: order.customerName,
      carrier: "GHN",
      trackingNumber: "DEMO-1",
      shippingFee: 10_000,
      expectedDelivery: new Date().toISOString(),
      status: "WAITING_PICKUP",
      address: order.customerAddress,
    });
    expect(created.ok).toBe(true);
    const { id: _createdId, ...shipmentInput } = created.data!;
    expect(shippingService.create(shipmentInput)).toMatchObject({
      ok: false,
      code: "CONFLICT",
    });
    expect(shippingService.updateStatus(created.data!.id, "PICKED_UP").ok).toBe(true);
    expect(store.getSnapshot().orders[0]?.status).toBe("SHIPPING");
    expect(shippingService.updateStatus(created.data!.id, "WAITING_PICKUP")).toMatchObject({
      ok: false,
      code: "INVALID_TRANSITION",
    });
  });
});
