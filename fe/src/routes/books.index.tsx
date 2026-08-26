import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterBar } from "@/components/shared/filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { BookFormDialog } from "@/components/books/book-form-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bookApi, type BookApiItem } from "@/lib/book-api";
import { categoryApi } from "@/lib/category-api";
import { formatCurrency } from "@/utils/format";
import { bookStatusLabel, bookStatusTone } from "@/utils/status";
import type { Book } from "@/types";

const mapApiBook = (book: BookApiItem): Book => {
  const stock = Number(book?.stock ?? 0);
  const minStock = Number(book?.minStock ?? 0);
  const rawStatus = (book?.status as any) || (stock === 0 ? "OUT_OF_STOCK" : stock <= minStock ? "LOW_STOCK" : "IN_STOCK");

  return {
    id: String(book?.id ?? ""),
    title: String(book?.title ?? ""),
    author: String(book?.author ?? ""),
    category: String(book?.category ?? ""),
    purchasePrice: Number(book?.purchasePrice ?? 0),
    sellingPrice: Number(book?.sellingPrice ?? 0),
    stock,
    minStock,
    status: rawStatus,
    createdAt: typeof book?.createdAt === "string" ? book.createdAt : new Date(book?.createdAt ?? Date.now()).toISOString(),
  };
};

export const Route = createFileRoute("/books/")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => {
    const q = typeof search['q'] === "string" ? search['q'] : undefined;
    return q ? { q } : {};
  },
  head: () => ({
    meta: [
      { title: "Quản lý sách — BookStock" },
      { name: "description", content: "Danh sách đầu sách: tìm kiếm, lọc, thêm, sửa và xóa sách trong kho." },
      { property: "og:title", content: "Quản lý sách — BookStock" },
      { property: "og:description", content: "Quản lý toàn bộ đầu sách, giá nhập, giá bán và tồn kho." },
    ],
  }),
  component: BooksPage,
});

function BooksPage() {
  const { q: initialQuery } = Route.useSearch();
  const [search, setSearch] = useState(initialQuery ?? "");

  useEffect(() => {
    setSearch(initialQuery ?? "");
  }, [initialQuery]);

  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const { data: rawCategories = [] } = useQuery({
    queryKey: ["category-names"],
    queryFn: async () => {
      try {
        const res = await categoryApi.list({ size: 100 });
        const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        return items.map((c: any) => (typeof c === "string" ? c : c?.name)).filter(Boolean) as string[];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  const categoryNames = useMemo(() => {
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

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books", search, category, status],
    queryFn: async () => {
      try {
        const response = await bookApi.list({
          search: search.trim() || undefined,
          category: category === "all" ? undefined : category,
          status: status === "all" ? undefined : status,
          page: 1,
          size: 200,
        });
        const items = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
        return (items as BookApiItem[]).map(mapApiBook);
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });

  const data = useMemo(
    () =>
      (books || []).filter((b) => {
        if (!b) return false;
        const q = (search || "").trim().toLowerCase();
        const title = (b.title || "").toLowerCase();
        const author = (b.author || "").toLowerCase();
        const matchQ = !q || title.includes(q) || author.includes(q);
        const matchC = category === "all" || b.category === category;
        const matchS = status === "all" || b.status === status;
        return matchQ && matchC && matchS;
      }),
    [books, search, category, status],
  );

  const columns: DataTableColumn<Book>[] = [
    {
      key: "title",
      header: "Tên sách",
      sortable: true,
      value: (b) => b.title ?? "",
      cell: (b) => (
        <Link to="/books/$bookId" params={{ bookId: b.id }} className="font-medium hover:text-primary">
          {b.title || "—"}
        </Link>
      ),
    },
    {
      key: "author",
      header: "Tác giả",
      sortable: true,
      value: (b) => b.author ?? "",
      cell: (b) => b.author || "—",
    },
    {
      key: "category",
      header: "Danh mục",
      cell: (b) => <span className="text-muted-foreground">{b.category || "—"}</span>,
    },
    {
      key: "purchase",
      header: "Giá nhập",
      align: "right",
      sortable: true,
      value: (b) => b.purchasePrice ?? 0,
      cell: (b) => <span className="tabular-nums">{formatCurrency(b.purchasePrice ?? 0)}</span>,
    },
    {
      key: "selling",
      header: "Giá bán",
      align: "right",
      sortable: true,
      value: (b) => b.sellingPrice ?? 0,
      cell: (b) => <span className="tabular-nums">{formatCurrency(b.sellingPrice ?? 0)}</span>,
    },
    {
      key: "stock",
      header: "Tồn",
      align: "right",
      sortable: true,
      value: (b) => b.stock ?? 0,
      cell: (b) => <span className="tabular-nums">{b.stock ?? 0}</span>,
    },
    {
      key: "status",
      header: "Trạng thái",
      cell: (b) => {
        const s = (b.status as BookStatus) || "IN_STOCK";
        return (
          <StatusBadge tone={bookStatusTone[s] || "neutral"}>
            {bookStatusLabel[s] || s}
          </StatusBadge>
        );
      },
    },
  ];

  return (
    <AppShell crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Sách" }]}>
      <PageContainer>
        <PageHeader
          title="Quản lý sách"
          description={`${books.length} đầu sách đang được theo dõi.`}
          actions={
            <BookFormDialog
              trigger={
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Thêm sách
                </Button>
              }
            />
          }
        />

        <DataTable
          columns={columns}
          data={data}
          rowKey={(b) => b.id}
          pageSize={10}
          emptyTitle="No books found"
          emptyDescription="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc."
          toolbar={
            <FilterBar>
              <SearchInput
                className="sm:w-72"
                value={search}
                onValueChange={setSearch}
                placeholder="Tìm theo tên, tác giả..."
              />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả danh mục</SelectItem>
                  {categoryNames.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="IN_STOCK">Còn hàng</SelectItem>
                  <SelectItem value="LOW_STOCK">Sắp hết</SelectItem>
                  <SelectItem value="OUT_OF_STOCK">Hết hàng</SelectItem>
                </SelectContent>
              </Select>
            </FilterBar>
          }
          rowActions={(b) => <BookRowActions book={b} />}
        />
        {isLoading && <p className="mt-3 text-sm text-muted-foreground">Đang tải dữ liệu sách...</p>}
      </PageContainer>
    </AppShell>
  );
}

function BookRowActions({ book }: { book: Book }) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to="/books/$bookId" params={{ bookId: book.id }}>
              <Eye className="mr-2 h-4 w-4" /> Xem chi tiết
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()} asChild>
            <BookFormDialog
              book={book}
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
        title="Xóa sách này?"
        description={`"${book.title}" sẽ bị xóa khỏi danh sách.`}
        confirmLabel="Xóa"
        onConfirm={async () => {
          try {
            await bookApi.remove(book.id);
            await queryClient.invalidateQueries({ queryKey: ["books"] });
            toast.success("Đã xóa sách");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Xóa sách thất bại");
          }
        }}
      />
    </>
  );
}
