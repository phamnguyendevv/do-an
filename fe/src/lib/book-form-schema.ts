import { z } from "zod";

export const bookFormSchema = z.object({
  title: z.string().min(1, "Vui lòng nhập tên sách"),
  author: z.string().min(1, "Vui lòng nhập tác giả"),
  category: z.string().min(1, "Vui lòng chọn danh mục"),
  purchasePrice: z.coerce.number().min(0, "Giá nhập không hợp lệ"),
  sellingPrice: z.coerce.number().min(0, "Giá bán không hợp lệ"),
  stock: z.coerce.number().min(0, "Tồn kho không hợp lệ"),
  minStock: z.coerce.number().min(0, "Tồn tối thiểu không hợp lệ"),
});

export type BookFormValues = z.input<typeof bookFormSchema>;
