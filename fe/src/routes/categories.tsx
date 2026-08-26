import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FolderTree, MoreHorizontal, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SearchInput } from "@/components/shared/search-input";
import { FilterBar } from "@/components/shared/filter-bar";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { categoryApi, type CategoryApiItem } from "@/lib/category-api";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Danh mục sách — BookStock" },
      { name: "description", content: "Quản lý các danh mục phân loại sách trong hệ thống." },
      { property: "og:title", content: "Danh mục sách — BookStock" },
      { property: "og:description", content: "Quản lý và thiết lập danh mục phân loại sách." },
    ],
  }),
  component: CategoriesPage,
});

const categorySchema = z.object({
  name: z.string().min(1, "Tên danh mục không được để trống").max(255, "Tên quá dài"),
  description: z.string().max(2000, "Mô tả tối đa 2000 ký tự").optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

function CategoryFormDialog({
  category,
  trigger,
}: {
  category?: CategoryApiItem;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? "",
      description: category?.description ?? "",
    },
  });

  const onSubmit = async (values: CategoryFormValues) => {
    setSubmitting(true);
    try {
      if (category) {
        await categoryApi.update(category.id, values);
        toast.success("Cập nhật danh mục thành công");
      } else {
        await categoryApi.create(values);
        toast.success("Thêm danh mục mới thành công");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      await queryClient.invalidateQueries({ queryKey: ["category-names"] });
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra khi lưu danh mục");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v) {
        form.reset({
          name: category?.name ?? "",
          description: category?.description ?? "",
        });
      }
    }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}</DialogTitle>
          <DialogDescription>
            {category
              ? "Cập nhật tên hoặc mô tả của danh mục sách này."
              : "Tạo danh mục mới để phân loại các đầu sách trong kho."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Tên danh mục <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Ví dụ: Công nghệ, Văn học, Kinh tế..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả (tùy chọn)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Mô tả tóm tắt về loại sách thuộc danh mục này..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Đang lưu..." : "Lưu danh mục"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CategoryRowActions({ category }: { category: CategoryApiItem }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    try {
      await categoryApi.remove(category.id);
      await queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      await queryClient.invalidateQueries({ queryKey: ["category-names"] });
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Đã xóa danh mục");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa danh mục");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={(e) => e.preventDefault()} asChild>
            <CategoryFormDialog
              category={category}
              trigger={
                <button className="flex w-full items-center px-2 py-1.5 text-sm">
                  <Pencil className="mr-2 h-4 w-4" /> Chỉnh sửa
                </button>
              }
            />
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onSelect={() => setConfirmOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Xóa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Xác nhận xóa danh mục?"
        description={`Danh mục "${category.name}" sẽ bị xóa khỏi hệ thống.`}
        confirmLabel="Xóa"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}

function CategoriesPage() {
  const [search, setSearch] = useState("");

  const { data: rawCategories = [], isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      try {
        const res = await categoryApi.list({ size: 200 });
        const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        return items;
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });

  const categories: CategoryApiItem[] = useMemo(() => {
    if (!Array.isArray(rawCategories)) return [];
    return rawCategories
      .map((item: any) => {
        if (typeof item === "string") return { id: 0, name: item, description: "" };
        return item;
      })
      .filter((item): item is CategoryApiItem => Boolean(item && typeof item.name === "string"));
  }, [rawCategories]);

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)),
    );
  }, [categories, search]);

  const columns: DataTableColumn<CategoryApiItem>[] = [
    {
      key: "id",
      header: "ID",
      sortable: true,
      value: (c) => c.id,
      cell: (c) => <span className="font-mono text-xs text-muted-foreground">#{c.id}</span>,
    },
    {
      key: "name",
      header: "Tên danh mục",
      sortable: true,
      value: (c) => c.name,
      cell: (c) => (
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary/70" />
          <span className="font-medium">{c.name}</span>
        </div>
      ),
    },
    {
      key: "description",
      header: "Mô tả",
      value: (c) => c.description ?? "",
      cell: (c) => (
        <span className="text-sm text-muted-foreground line-clamp-1">
          {c.description || "—"}
        </span>
      ),
    },
  ];

  return (
    <AppShell crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Danh mục sách" }]}>
      <PageContainer>
        <PageHeader
          title="Quản lý danh mục sách"
          description="Phân loại các đầu sách trong kho giúp dễ dàng quản lý và tìm kiếm."
          actions={
            <CategoryFormDialog
              trigger={
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Thêm danh mục
                </Button>
              }
            />
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Tổng số danh mục"
            value={categories.length}
            hint="Danh mục hoạt động"
          />
          <StatCard
            label="Có mô tả chi tiết"
            value={categories.filter((c) => Boolean(c.description)).length}
            hint="Giúp phân loại chính xác"
          />
          <StatCard
            label="Danh mục đang xem"
            value={filteredData.length}
            hint={search ? `Khớp với "${search}"` : "Tất cả danh mục"}
          />
        </div>

        <DataTable
          columns={columns}
          data={filteredData}
          rowKey={(c) => c.id}
          pageSize={10}
          emptyTitle="Không tìm thấy danh mục"
          emptyDescription="Thử nhập từ khóa tìm kiếm khác hoặc thêm danh mục mới."
          toolbar={
            <FilterBar>
              <SearchInput
                className="sm:w-80"
                value={search}
                onValueChange={setSearch}
                placeholder="Tìm kiếm danh mục theo tên, mô tả..."
              />
            </FilterBar>
          }
          rowActions={(c) => <CategoryRowActions category={c} />}
        />
        {isLoading && <p className="mt-3 text-sm text-muted-foreground">Đang tải danh mục sách...</p>}
      </PageContainer>
    </AppShell>
  );
}
