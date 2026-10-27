import { describe, expect, it } from "vitest";
import {
  buildReport,
  growth,
  reorderSuggestions,
  reportService,
  selectInventorySummary,
  selectOrderTotals,
  selectStockMovementSeries,
} from "./report-service";
import type { AppState } from "./store";
import type { Book, Order } from "@/types";

const book: Book = {
  id: "BK-1",
  title: "Sách A",
  author: "A",
  category: "Văn học",
  purchasePrice: 50_000,
  sellingPrice: 100_000,
  stock: 2,
  minStock: 10,
  status: "LOW_STOCK",
  createdAt: new Date().toISOString(),
};

const makeOrder = (
  daysAgo: number,
  total: number,
  status: Order["status"] = "DELIVERED",
): Order => ({
  id: `ORD-${daysAgo}-${total}`,
  customerName: "K",
  customerPhone: "0",
  customerAddress: "A",
  items: [{ bookId: "BK-1", title: "Sách A", quantity: 2, price: 100_000 }],
  subtotal: total,
  discount: 0,
  shippingFee: 0,
  total,
  payment: "PAID",
  shippingMethod: "GHTK",
  status,
  createdAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
});

describe("report-service", () => {
  it("tách kỳ hiện tại và kỳ trước", () => {
    const report = buildReport([makeOrder(2, 300_000), makeOrder(12, 100_000)], [book], "7d");
    expect(report.current.revenue).toBe(300_000);
    expect(report.previous.revenue).toBe(100_000);
    expect(report.current.orders).toBe(1);
  });

  it("bỏ qua đơn đã hủy khi tính doanh thu", () => {
    const report = buildReport([makeOrder(1, 500_000, "CANCELLED")], [book], "7d");
    expect(report.current.revenue).toBe(0);
  });

  it("tính tăng trưởng phần trăm", () => {
    expect(growth(150, 100)).toBeCloseTo(50);
    expect(growth(100, 0)).toBeNull();
  });

  it("đề xuất nhập hàng cho sách dưới mức tối thiểu", () => {
    const [suggestion] = reorderSuggestions([book]);
    expect(suggestion?.suggestedQuantity).toBe(18);
  });

  it("uses the purchase-price snapshot for historical COGS and reports an actual loss", () => {
    const historicalOrder = {
      ...makeOrder(1, 150_000),
      items: [
        {
          bookId: book.id,
          title: book.title,
          quantity: 2,
          price: 75_000,
          purchasePrice: 90_000,
        },
      ],
    };
    const totals = selectOrderTotals([historicalOrder], [book]);
    expect(totals.cogs).toBe(180_000);
    expect(totals.grossProfit).toBe(-30_000);
  });

  it("selects inventory totals and stock movement from the same business state", () => {
    const state: AppState = {
      books: [book],
      orders: [],
      imports: [],
      exports: [],
      shipments: [],
      categories: [],
      publishers: [],
      suppliers: [],
      customers: [],
      users: [],
      stocktakes: [],
      movements: [
        {
          id: "MOV-1",
          bookId: book.id,
          bookTitle: book.title,
          type: "IMPORT",
          quantity: 4,
          beforeStock: 2,
          afterStock: 6,
          createdAt: new Date(2026, 9, 15).toISOString(),
        },
        {
          id: "MOV-2",
          bookId: book.id,
          bookTitle: book.title,
          type: "SALE",
          quantity: 1,
          beforeStock: 6,
          afterStock: 5,
          createdAt: new Date(2026, 9, 16).toISOString(),
        },
      ],
      processedOperationKeys: [],
    };
    const summary = selectInventorySummary(state);
    const series = selectStockMovementSeries(1, new Date(2026, 9, 20), state);
    expect(summary).toEqual({
      totalStock: 2,
      lowStock: 1,
      outOfStock: 0,
      inventoryValue: 100_000,
    });
    expect(series).toEqual([{ month: "T10", nhap: 4, xuat: 1 }]);
  });

  it("returns structured validation errors for invalid report ranges", () => {
    expect(reportService.getReport("unknown" as never)).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });
  });
});
