import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bookApi } from "@/lib/book-api";
import { categoryApi } from "@/lib/category-api";
import type { Book } from "@/types";

export const bookFormSchema = z.object({
  title: z.string().min(1, "Vui lòng nhập tên sách"),
  author: z.string().min(1, "Vui lòng nhập tác giả"),
  category: z.string().min(1, "Vui lòng chọn danh mục"),
  purchasePrice: z.coerce.number().min(0, "Giá nhập không hợp lệ"),
  sellingPrice: z.coerce.number().min(0, "Giá bán không hợp lệ"),
  stock: z.coerce.number().min(0, "Tồn kho không hợp lệ"),
  minStock: z.coerce.number().min(0, "Tồn tối thiểu không hợp lệ"),
});

type FormValues = z.input<typeof bookFormSchema>;

async function fetchCategoryOptions(): Promise<string[]> {
  try {
    const res = await categoryApi.list({ size: 100 });
    const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    return items
      .map((item: any) => (typeof item === "string" ? item : item?.name))
      .filter(Boolean) as string[];
  } catch {
    return [];
  }
}

interface BookFormDialogProps {
  trigger: ReactNode;
  book?: Book;
}

export function BookFormDialog({ trigger, book }: BookFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: rawCategories = [] } = useQuery({
    queryKey: ["category-names"],
    queryFn: fetchCategoryOptions,
    staleTime: 60_000,
    retry: false,
  });

  const categories = useMemo(() => {
    if (!Array.isArray(rawCategories)) return [];
    return Array.from(
      new Set(
        rawCategories
          .map((c: any) => (typeof c === "string" ? c : c?.name))
          .map((s) => (typeof s === "string" ? s.trim() : ""))
          .filter((name): name is string => Boolean(name && name.length > 0)),
      ),
    );
  }, [rawCategories]);

  const form = useForm<FormValues>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      title: book?.title ?? "",
      author: book?.author ?? "",
      category: book?.category ?? "",
      purchasePrice: book?.purchasePrice ?? 0,
      sellingPrice: book?.sellingPrice ?? 0,
      stock: book?.stock ?? 0,
      minStock: book?.minStock ?? 0,
    },
  });

  useEffect(() => {
    if (book && book.category) {
      form.setValue("category", book.category);
    }
  }, [book, form]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const payload = {
        title: values.title,
        author: values.author,
        category: values.category,
        purchasePrice: Number(values.purchasePrice),
        sellingPrice: Number(values.sellingPrice),
        stock: Number(values.stock),
        minStock: Number(values.minStock),
      };

      if (book) {
        await bookApi.update(book.id, payload);
      } else {
        await bookApi.create(payload);
      }

      await queryClient.invalidateQueries({ queryKey: ["books"] });
      setOpen(false);
      toast.success(book ? "Cập nhật sách thành công" : "Thêm sách thành công");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu sách");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{book ? "Chỉnh sửa sách" : "Thêm sách mới"}</DialogTitle>
          <DialogDescription>Thông tin cơ bản và giá bán của đầu sách.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <section className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Thông tin sách
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Tên sách <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Nhập tên sách" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Tác giả <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Nhập tác giả" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Danh mục <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn danh mục" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Giá & tồn kho
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giá nhập (₫)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sellingPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giá bán (₫)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tồn kho</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="minStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tồn tối thiểu</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Đang lưu..." : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
