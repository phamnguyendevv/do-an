import { describe, expect, it } from "vitest";

import type { Book, Order } from "@/types";
import { recommendReorders } from "./warehouse-intel";

const now = new Date("2026-10-25T12:00:00.000Z").getTime();
const book = (id: string, stock: number, minStock: number): Book => ({
  id,
  title: `Book ${id}`,
  author: "Author",
  category: "Fiction",
  purchasePrice: 100,
  sellingPrice: 200,
  stock,
  minStock,
  status: stock === 0 ? "OUT_OF_STOCK" : "IN_STOCK",
  createdAt: new Date(now - 180 * 86_400_000).toISOString(),
});

const order = (bookId: string, quantity: number, daysAgo = 1): Order => ({
  id: `order-${bookId}`,
  customerName: "Customer",
  customerPhone: "0000000000",
  customerAddress: "Address",
  items: [{ bookId, title: `Book ${bookId}`, quantity, price: 200 }],
  subtotal: quantity * 200,
  discount: 0,
  shippingFee: 0,
  total: quantity * 200,
  payment: "PAID",
  shippingMethod: "Pickup",
  status: "DELIVERED",
  createdAt: new Date(now - daysAgo * 86_400_000).toISOString(),
});

describe("recommendReorders", () => {
  it("tính lượng nhập để phủ thời gian giao hàng, mục tiêu tồn và tồn an toàn", () => {
    const recommendations = recommendReorders(
      {
        books: [book("fast", 4, 2)],
        orders: [order("fast", 30)],
        imports: [],
        exports: [],
      },
      { leadTimeDays: 7, targetCoverageDays: 30 },
      now,
    );

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]).toMatchObject({
      soldLast30Days: 30,
      daysOfStock: 4,
      targetStock: 39,
      proposedQuantity: 35,
    });
  });

  it("không gợi ý nhập sách không có doanh số gần đây hoặc còn đủ tồn qua lead time", () => {
    const recommendations = recommendReorders(
      {
        books: [book("slow", 2, 2), book("healthy", 40, 2)],
        orders: [order("healthy", 30)],
        imports: [],
        exports: [],
      },
      { leadTimeDays: 7 },
      now,
    );

    expect(recommendations).toEqual([]);
  });

  it("đưa sách hết hàng nhưng vẫn đang bán lên đầu danh sách", () => {
    const recommendations = recommendReorders(
      {
        books: [book("low", 3, 3), book("out", 0, 2)],
        orders: [order("low", 30), order("out", 15)],
        imports: [],
        exports: [],
      },
      {},
      now,
    );

    expect(recommendations.map((item) => item.book.id)).toEqual(["out", "low"]);
    expect(recommendations[0]?.daysOfStock).toBe(0);
  });
});
