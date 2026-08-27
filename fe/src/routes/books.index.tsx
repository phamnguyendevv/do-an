import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, FileSpreadsheet, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterBar } from "@/components/shared/filter-bar";
import { DateRangePicker, type DateRange } from "@/components/shared/date-range-picker";
import { PriceRangeFilter, type PriceRange } from "@/components/shared/price-range-filter";
import { ActiveFilterChips, type ActiveFilter } from "@/components/shared/active-filter-chips";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { BookFormDialog } from "@/components/books/book-form-dialog";
import { ExcelBookImportDialog } from "@/components/books/excel-book-import-dialog";
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
import { bookApi } from "@/lib/book-api";
import { categoryApi } from "@/lib/category-api";
import { exportBooksToExcel } from "@/lib/excel-service";
import { usePaginatedBooks } from "@/hooks/use-paginated-books";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatCompactCurrency, formatCurrency } from "@/utils/format";
import { bookStatusLabel, bookStatusTone } from "@/utils/status";
import { Can } from "@/lib/ability";
import type { Book, BookStatus } from "@/types";

export const Route = createFileRoute("/books/")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => {
    const q = typeof search['q'] === "string" ? search['q'] : undefined;
    return q ? { q } : {};
  },
  head: () => ({
    meta: [
      { title: "Quản lý sách — BookStock" },
      { name: "description", content: "Danh sách đầu sách: tìm kiếm, lọc, thêm, sửa, nhập xuất Excel và xóa sách trong kho." },
      { property: "og:title", content: "Quản lý sách — BookStock" },
      { property: "og:description", content: "Quản lý toàn bộ đầu sách, giá nhập, giá bán và tồn kho." },
    ],
  }),
  component: BooksPage,
});

function BooksPage() {
  const { q: initialQuery } = Route.useSearch();
  const [search, setSearch] = useState(initialQuery ?? "");
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setSearch(initialQuery ?? "");
  }, [initialQuery]);

  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [priceRange, setPriceRange] = useState<PriceRange>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const queryClient = useQueryClient();

  const resetPage = () => setPage(1);

  // Compute ActiveFilterChips list
  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const chips: ActiveFilter[] = [];
    if (debouncedSearch)
      chips.push({ key: "search", label: `Từ khóa: "${debouncedSearch}"`, onRemove: () => { setSearch(""); resetPage(); } });
    if (category !== "all")
      chips.push({ key: "category", label: `Danh mục: ${category}`, onRemove: () => { setCategory("all"); resetPage(); } });
    if (status !== "all")
      chips.push({ key: "status", label: `Trạng thái: ${bookStatusLabel[status as BookStatus] ?? status}`, onRemove: () => { setStatus("all"); resetPage(); } });
    if (priceRange.min !== undefined || priceRange.max !== undefined) {
      const label = [priceRange.min !== undefined ? `Từ ${formatCompactCurrency(priceRange.min)}` : null, priceRange.max !== undefined ? `đến ${formatCompactCurrency(priceRange.max)}` : null].filter(Boolean).join(" ");
      chips.push({ key: "price", label: `Giá: ${label}`, onRemove: () => { setPriceRange({}); resetPage(); } });
    }
    if (dateRange?.from) {
      const d = dateRange;
      const label = d.to ? `${d.from.toLocaleDateString("vi")} – ${d.to.toLocaleDateString("vi")}` : d.from.toLocaleDateString("vi");
      chips.push({ key: "date", label: `Ngày tạo: ${label}`, onRemove: () => { setDateRange(undefined); resetPage(); } });
    }
    return chips;
  }, [debouncedSearch, category, status, priceRange, dateRange]);

  const clearAllFilters = () => {
    setSearch("");
    setCategory("all");
    setStatus("all");
    setPriceRange({});
    setDateRange(undefined);
    setPage(1);
  };

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

  const { books, pagination, isLoading, isFetching, error } = usePaginatedBooks({
    page,
    size: pageSize,
    search: debouncedSearch,
    category,
    status,
    minPrice: priceRange.min,
    maxPrice: priceRange.max,
    startDate: dateRange?.from?.toISOString(),
    endDate: dateRange?.to?.toISOString(),
  });

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
      cell: (b) => <span className="tabular-nums font-semibold">{b.stock ?? 0}</span>,
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
          description={`${pagination.total} đầu sách đang được theo dõi trong hệ thống.`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportBooksToExcel(books)}
              >
                <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Xuất Excel
              </Button>
              <Can I="create" a="Book">
                <ExcelBookImportDialog
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["books"] });
                  }}
                />
                <BookFormDialog
                  trigger={
                    <Button size="sm">
                      <Plus className="mr-1.5 h-4 w-4" /> Thêm sách
                    </Button>
                  }
                />
              </Can>
            </div>
          }
        />

        <DataTable
          columns={columns}
          data={books}
          rowKey={(b) => b.id}
          pageSize={pageSize}
          loading={isLoading}
          error={error}
          serverPagination={{
            total: pagination.total,
            page,
            pageSize,
            onPageChange: (newPage) => setPage(newPage),
            onPageSizeChange: (newSize) => {
              setPageSize(newSize);
              setPage(1);
            },
            pageSizeOptions: [10, 20, 50, 100],
          }}
          emptyTitle="Không tìm thấy sách nào"
          emptyDescription="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc."
          toolbar={
            <div className="space-y-2">
              <FilterBar>
                <SearchInput
                  className="sm:w-64"
                  value={search}
                  onValueChange={(val) => { setSearch(val); resetPage(); }}
                  placeholder="Tìm theo tên, tác giả..."
                />
                <Select value={category} onValueChange={(val) => { setCategory(val); resetPage(); }}>
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
                <Select value={status} onValueChange={(val) => { setStatus(val); resetPage(); }}>
                  <SelectTrigger className="h-9 sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="IN_STOCK">Còn hàng</SelectItem>
                    <SelectItem value="LOW_STOCK">Sắp hết</SelectItem>
                    <SelectItem value="OUT_OF_STOCK">Hết hàng</SelectItem>
                  </SelectContent>
                </Select>
                <PriceRangeFilter
                  value={priceRange}
                  onValueChange={(r) => { setPriceRange(r); resetPage(); }}
                  label="Khoảng giá bán"
                />
                <DateRangePicker
                  value={dateRange}
                  onValueChange={(r) => { setDateRange(r); resetPage(); }}
                  placeholder="Ngày tạo"
                />
              </FilterBar>
              <ActiveFilterChips filters={activeFilters} onClearAll={clearAllFilters} />
            </div>
          }
          rowActions={(b) => <BookRowActions book={b} />}
        />
        {isFetching && !isLoading && (
          <p className="mt-2 text-xs text-muted-foreground animate-pulse">Đang cập nhật dữ liệu...</p>
        )}
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
          <Can I="update" a="Book">
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
          </Can>
          <Can I="delete" a="Book">
            <DropdownMenuItem className="text-destructive" onSelect={() => setConfirmOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Xóa
            </DropdownMenuItem>
          </Can>
        </DropdownMenuContent>
      </DropdownMenu>

      <Can I="delete" a="Book">
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
      </Can>
    </>
  );
}
