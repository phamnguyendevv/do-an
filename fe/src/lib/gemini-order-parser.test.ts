import { describe, expect, it, vi } from "vitest";
import { geminiParseCustomerAndAddress, geminiParseProducts } from "./gemini-order-parser";
import type { Book } from "@/types";
import type { GhnProvince } from "./ghn-api";

describe("Gemini Order Parser (Hybrid)", () => {
  const mockProvinces: GhnProvince[] = [
    { ProvinceID: 202, ProvinceName: "Hồ Chí Minh", Code: "HCM" },
  ];

  const mockBooks: Book[] = [
    {
      id: "b1",
      title: "Bộ Đề HSK Zhenti 5",
      author: "Tác giả",
      category: "Sách",
      purchasePrice: 100000,
      sellingPrice: 150000,
      stock: 20,
      minStock: 2,
      status: "IN_STOCK",
      createdAt: "2026-01-01",
    },
  ];

  it("gracefully falls back to local parser when API is unreachable", async () => {
    // When apiRequest fails/is not mocked, fallback should execute smoothly
    const res = await geminiParseCustomerAndAddress(
      "Nguyen Van A, 0908888888, 12 Le Duan, Ho Chi Minh",
      mockProvinces,
      async () => [],
      async () => [],
    );

    expect(res.customerName).toBe("Nguyen Van A");
    expect(res.customerPhone).toBe("0908888888");
    expect(res.provinceId).toBe(202);
  });

  it("gracefully falls back to local product parser when API is unreachable", async () => {
    const res = await geminiParseProducts("2 zhenti", mockBooks);
    expect(res.lines).toHaveLength(1);
    expect(res.lines[0].bookId).toBe("b1");
    expect(res.lines[0].quantity).toBe(2);
  });
});
