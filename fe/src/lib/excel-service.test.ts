import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { exportBooksToExcel, exportOrdersToExcel, exportMovementsToExcel } from "./excel-service";
import type { Book, Order } from "@/types";

describe("excel-service", () => {
  it("xuất file Excel sách không bị crash", () => {
    const sampleBooks: Book[] = [
      {
        id: "1",
        title: "Đắc Nhân Tâm",
        author: "Dale Carnegie",
        category: "Kỹ năng sống",
        purchasePrice: 65000,
        price: 95000,
        stock: 50,
        minStock: 10,
        status: "IN_STOCK",
      },
    ];

    expect(() => {
      exportBooksToExcel(sampleBooks, "test_books");
    }).not.toThrow();
  });

  it("xuất file Excel đơn hàng không bị crash", () => {
    const sampleOrders: Order[] = [
      {
        id: "1",
        orderCode: "ORD-2025001",
        customerName: "Nguyễn Văn A",
        customerPhone: "0901234567",
        customerAddress: "123 Lê Lợi, Q.1",
        items: [{ bookId: "1", title: "Đắc Nhân Tâm", quantity: 2, price: 95000 }],
        subtotal: 190000,
        discount: 0,
        shippingFee: 25000,
        total: 215000,
        payment: "PAID",
        shippingMethod: "Giao Hàng Nhanh (GHN)",
        status: "DELIVERED",
        createdAt: new Date().toISOString(),
      },
    ];

    expect(() => {
      exportOrdersToExcel(sampleOrders, "test_orders");
    }).not.toThrow();
  });

  it("xuất file Excel sổ kho không bị crash", () => {
    const sampleMovements: any[] = [
      {
        id: "1",
        bookTitle: "Đắc Nhân Tâm",
        type: "IMPORT",
        quantity: 50,
        beforeStock: 0,
        afterStock: 50,
        referenceCode: "IMP-1001",
        note: "Nhập hàng",
        createdBy: "Admin",
        createdAt: new Date().toISOString(),
      },
    ];

    expect(() => {
      exportMovementsToExcel(sampleMovements, "test_movements");
    }).not.toThrow();
  });
});
