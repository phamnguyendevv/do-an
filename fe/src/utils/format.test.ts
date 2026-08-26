import { describe, expect, it } from "vitest";
import { formatCompactCurrency, formatNumber } from "./format";
import { bookStatusOf } from "@/services/store";

describe("format", () => {
  it("rút gọn tiền tệ theo triệu / tỷ", () => {
    expect(formatCompactCurrency(1_500_000)).toBe("1.5 tr ₫");
    expect(formatCompactCurrency(2_000_000_000)).toBe("2.00 tỷ ₫");
  });

  it("định dạng số", () => {
    expect(formatNumber(1234)).toContain("1");
  });
});

describe("bookStatusOf", () => {
  it("trả về đúng trạng thái theo tồn kho", () => {
    expect(bookStatusOf(0, 5)).toBe("OUT_OF_STOCK");
    expect(bookStatusOf(5, 5)).toBe("LOW_STOCK");
    expect(bookStatusOf(20, 5)).toBe("IN_STOCK");
  });
});
