import { describe, it, expect } from "vitest";
import { parseProductList, extractQuantityAndKeyword, findBestMatchingBook } from "./product-parser";
import type { Book } from "@/types";

describe("Product Quick Parser", () => {
  const mockBooks: Book[] = [
    {
      id: "b1",
      title: "Bộ Đề HSK Zhenti 5",
      author: "Nhiều tác giả",
      category: "Tiếng Trung",
      purchasePrice: 100000,
      sellingPrice: 150000,
      stock: 20,
      minStock: 2,
      status: "IN_STOCK",
      createdAt: "2026-01-01",
    },
    {
      id: "b2",
      title: "Sách Bản Xanh Lá HSK",
      author: "Văn phòng HSK",
      category: "Tiếng Trung",
      purchasePrice: 120000,
      sellingPrice: 180000,
      stock: 15,
      minStock: 2,
      status: "IN_STOCK",
      createdAt: "2026-01-01",
    },
    {
      id: "b3",
      title: "Giáo Trình Tinh Giảng Ngữ Pháp",
      author: "Lý Quân",
      category: "Ngữ Pháp",
      purchasePrice: 90000,
      sellingPrice: 135000,
      stock: 10,
      minStock: 2,
      status: "IN_STOCK",
      createdAt: "2026-01-01",
    },
    {
      id: "b4",
      title: "25 Tian Chinh Phục HSK 5",
      author: "Bắc Kinh",
      category: "Luyện Thi",
      purchasePrice: 110000,
      sellingPrice: 160000,
      stock: 8,
      minStock: 2,
      status: "IN_STOCK",
      createdAt: "2026-01-01",
    },
    {
      id: "b5",
      title: "Học Máy Và Trí Tuệ Nhân Tạo",
      author: "Aurélien Géron",
      category: "Công nghệ",
      purchasePrice: 250000,
      sellingPrice: 390000,
      stock: 12,
      minStock: 2,
      status: "IN_STOCK",
      createdAt: "2026-01-01",
    },
    {
      id: "b6",
      title: "Chuyện Con Mèo Dạy Hải Âu Bay",
      author: "Luis Sepúlveda",
      category: "Văn học",
      purchasePrice: 35000,
      sellingPrice: 58000,
      stock: 38,
      minStock: 2,
      status: "IN_STOCK",
      createdAt: "2026-01-01",
    },
    {
      id: "b7",
      title: "Khởi Nghiệp Tinh Gọn",
      author: "Eric Ries",
      category: "Kinh doanh",
      purchasePrice: 90000,
      sellingPrice: 145000,
      stock: 24,
      minStock: 2,
      status: "IN_STOCK",
      createdAt: "2026-01-01",
    },
  ];

  it("parses user exact case: 4 quyển Học Máy Và Trí Tuệ Nhân Tạo + Chuyện Con Mèo Dạy Hải Âu Bay + 3 Khởi Nghiệp Tinh Gọn", () => {
    const input = "4 quyển  Học Máy Và Trí Tuệ Nhân Tạo + Chuyện Con Mèo Dạy Hải Âu Bay + 3 Khởi Nghiệp Tinh Gọn";
    const res = parseProductList(input, mockBooks);

    expect(res.matchedItems).toHaveLength(3);
    expect(res.unmatchedTokens).toHaveLength(0);
    expect(res.lines).toHaveLength(3);

    // b5: Học Máy (qty = 4, price = 390000)
    const lineHocMay = res.lines.find((l) => l.bookId === "b5");
    expect(lineHocMay?.quantity).toBe(4);
    expect(lineHocMay?.price).toBe(390000);

    // b6: Con Mèo (qty = 1, price = 58000)
    const lineConMeo = res.lines.find((l) => l.bookId === "b6");
    expect(lineConMeo?.quantity).toBe(1);
    expect(lineConMeo?.price).toBe(58000);

    // b7: Khởi Nghiệp (qty = 3, price = 145000)
    const lineKhoiNghiep = res.lines.find((l) => l.bookId === "b7");
    expect(lineKhoiNghiep?.quantity).toBe(3);
    expect(lineKhoiNghiep?.price).toBe(145000);

    expect(res.totalQuantity).toBe(8);
  });

  it("filters conversational vocatives like 'E oii gửi thêm cho c' and 'freesip nha'", () => {
    const input = "E oii gửi thêm cho c  4 quyển  Học Máy Và Trí Tuệ Nhân Tạo  và  Chuyện Con Mèo Dạy Hải Âu Bay + 3 Khởi Nghiệp Tinh Gọn freesip nha";
    const res = parseProductList(input, mockBooks);

    expect(res.matchedItems).toHaveLength(3);
    expect(res.unmatchedTokens).toHaveLength(0);
    expect(res.lines).toHaveLength(3);

    // b5: Học Máy (qty = 4)
    const lineHocMay = res.lines.find((l) => l.bookId === "b5");
    expect(lineHocMay?.quantity).toBe(4);

    // b6: Con Mèo (qty = 1)
    const lineConMeo = res.lines.find((l) => l.bookId === "b6");
    expect(lineConMeo?.quantity).toBe(1);

    // b7: Khởi Nghiệp (qty = 3)
    const lineKhoiNghiep = res.lines.find((l) => l.bookId === "b7");
    expect(lineKhoiNghiep?.quantity).toBe(3);

    expect(res.totalQuantity).toBe(8);
  });

  it("filters conversational phrases like 'mình lấy 8 cuốn này' and 'freesip nha'", () => {
    const input = "mình lấy 8 cuốn này  4 quyển  Học Máy Và Trí Tuệ Nhân Tạo  và  Chuyện Con Mèo Dạy Hải Âu Bay + 3 Khởi Nghiệp Tinh Gọn freesip nha";
    const res = parseProductList(input, mockBooks);

    expect(res.matchedItems).toHaveLength(3);
    expect(res.unmatchedTokens).toHaveLength(0);
    expect(res.lines).toHaveLength(3);

    // b5: Học Máy (qty = 4)
    const lineHocMay = res.lines.find((l) => l.bookId === "b5");
    expect(lineHocMay?.quantity).toBe(4);

    // b6: Con Mèo (qty = 1)
    const lineConMeo = res.lines.find((l) => l.bookId === "b6");
    expect(lineConMeo?.quantity).toBe(1);

    // b7: Khởi Nghiệp (qty = 3)
    const lineKhoiNghiep = res.lines.find((l) => l.bookId === "b7");
    expect(lineKhoiNghiep?.quantity).toBe(3);

    expect(res.totalQuantity).toBe(8);
  });

  it("handles 'và' both inside book title and as conjunction separator between books", () => {
    const input = "4 quyển  Học Máy Và Trí Tuệ Nhân Tạo  và  Chuyện Con Mèo Dạy Hải Âu Bay + 3 Khởi Nghiệp Tinh Gọn";
    const res = parseProductList(input, mockBooks);

    expect(res.matchedItems).toHaveLength(3);
    expect(res.unmatchedTokens).toHaveLength(0);
    expect(res.lines).toHaveLength(3);

    // b5: Học Máy (qty = 4)
    const lineHocMay = res.lines.find((l) => l.bookId === "b5");
    expect(lineHocMay?.quantity).toBe(4);

    // b6: Con Mèo (qty = 1)
    const lineConMeo = res.lines.find((l) => l.bookId === "b6");
    expect(lineConMeo?.quantity).toBe(1);

    // b7: Khởi Nghiệp (qty = 3)
    const lineKhoiNghiep = res.lines.find((l) => l.bookId === "b7");
    expect(lineKhoiNghiep?.quantity).toBe(3);

    expect(res.totalQuantity).toBe(8);
  });

  it("extracts quantity and keyword correctly", () => {
    expect(extractQuantityAndKeyword("2 bản xanh lá")).toEqual({
      quantity: 2,
      keyword: "xanh lá",
    });
    expect(extractQuantityAndKeyword("3x zhenti")).toEqual({
      quantity: 3,
      keyword: "zhenti",
    });
    expect(extractQuantityAndKeyword("tinh giảng")).toEqual({
      quantity: 1,
      keyword: "tinh giảng",
    });
    expect(extractQuantityAndKeyword("25 tian")).toEqual({
      quantity: 25,
      keyword: "tian",
    });
    expect(extractQuantityAndKeyword("zhenti 4")).toEqual({
      quantity: 4,
      keyword: "zhenti",
    });
  });

  it("parses user exact case: 2 bản xanh lá + zhenti+ tinh giảng+ 25 tian", () => {
    const input = "2 bản xanh lá + zhenti+ tinh giảng+ 25 tian";
    const res = parseProductList(input, mockBooks);

    expect(res.matchedItems).toHaveLength(4);
    expect(res.unmatchedTokens).toHaveLength(0);
    expect(res.lines).toHaveLength(4);

    // b2: Xanh lá (qty = 2)
    const lineXanhLa = res.lines.find((l) => l.bookId === "b2");
    expect(lineXanhLa?.quantity).toBe(2);
    expect(lineXanhLa?.price).toBe(180000);

    // b1: Zhenti (qty = 1)
    const lineZhenti = res.lines.find((l) => l.bookId === "b1");
    expect(lineZhenti?.quantity).toBe(1);

    // b3: Tinh giảng (qty = 1)
    const lineTinhGiang = res.lines.find((l) => l.bookId === "b3");
    expect(lineTinhGiang?.quantity).toBe(1);

    // b4: 25 tian (qty = 1)
    const line25Tian = res.lines.find((l) => l.bookId === "b4");
    expect(line25Tian?.quantity).toBe(1);

    expect(res.totalQuantity).toBe(5);
  });

  it("parses comma-separated and multi-line inputs with duplicate aggregation", () => {
    const input = `2 xanh lá\nzhenti x2\n1 bản xanh lá, tinh giảng`;
    const res = parseProductList(input, mockBooks);

    expect(res.matchedItems).toHaveLength(4);
    // b2: 2 + 1 = 3
    const lineXanhLa = res.lines.find((l) => l.bookId === "b2");
    expect(lineXanhLa?.quantity).toBe(3);

    // b1: 2
    const lineZhenti = res.lines.find((l) => l.bookId === "b1");
    expect(lineZhenti?.quantity).toBe(2);

    // b3: 1
    const lineTinhGiang = res.lines.find((l) => l.bookId === "b3");
    expect(lineTinhGiang?.quantity).toBe(1);
  });

  it("tracks unmatched tokens when book is not found in stock", () => {
    const input = "2 bản xanh lá + sach_khong_ton_tai";
    const res = parseProductList(input, mockBooks);

    expect(res.matchedItems).toHaveLength(2);
    expect(res.unmatchedTokens).toEqual(["sach_khong_ton_tai"]);
    expect(res.lines).toHaveLength(1);
  });
});
