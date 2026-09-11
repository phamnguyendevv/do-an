import { describe, expect, it } from "vitest";
import { buildReport, growth, reorderSuggestions } from "./report-service";
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
});
