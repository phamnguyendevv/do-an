import { describe, expect, it } from "vitest";

import { bookFormSchema } from "./book-form-dialog";

describe("bookFormSchema", () => {
  it("không bắt buộc nhà xuất bản khi tạo sách", () => {
    const result = bookFormSchema.safeParse({
      title: "Clean Code",
      author: "Robert C. Martin",
      category: "Công nghệ",
      purchasePrice: 210000,
      sellingPrice: 349000,
      stock: 64,
      minStock: 20,
    });

    expect(result.success).toBe(true);
  });
});
