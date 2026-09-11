import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  /** Value used for sorting/searching */
  value?: (row: T) => string | number;
  cell: (row: T) => ReactNode;
  className?: string;
}

export interface ServerPaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  toolbar?: ReactNode;
  pageSize?: number;
  loading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  rowActions?: (row: T) => ReactNode;
  serverPagination?: ServerPaginationProps;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  toolbar,
  pageSize = 10,
  loading = false,
  error = null,
  emptyTitle = "Không có dữ liệu",
  emptyDescription,
  rowActions,
  serverPagination,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [clientPage, setClientPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.value) return data;
    return [...data].sort((a, b) => {
      const av = col.value!(a);
      const bv = col.value!(b);
      const res =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? res : -res;
    });
  }, [data, sort, columns]);

  const isServer = Boolean(serverPagination);
  const currentPage = isServer ? serverPagination!.page : clientPage;
  const effectivePageSize = isServer ? serverPagination!.pageSize : pageSize;
  const totalCount = isServer ? serverPagination!.total : sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / effectivePageSize));

  const rows = isServer
    ? sorted
    : sorted.slice((currentPage - 1) * effectivePageSize, currentPage * effectivePageSize);

  const toggleSort = (key: string) =>
    setSort((s) =>
      s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    if (isServer) {
      serverPagination!.onPageChange(newPage);
    } else {
      setClientPage(newPage);
    }
  };

  const alignClass = (align?: string) =>
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  const startIdx = totalCount === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1;
  const endIdx = Math.min(currentPage * effectivePageSize, totalCount);

  return (
    <div className="space-y-3">
      {toolbar}

      {error ? (
        <ErrorState message={error} />
      ) : loading ? (
        <LoadingState rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          {...(emptyDescription ? { description: emptyDescription } : {})}
        />
      ) : (
        <>
          {/* Mobile: card/list view to avoid cramped horizontal scrolling */}
          <ul className="space-y-3 md:hidden">
            {rows.map((row) => (
              <li key={rowKey(row)} className="rounded-lg border bg-card p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    {columns.map((col) => (
                      <div key={col.key} className="flex items-start justify-between gap-3">
                        <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {col.header}
                        </span>
                        <span className="min-w-0 break-words text-right text-sm">
                          {col.cell(row)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {rowActions ? <div className="shrink-0">{rowActions(row)}</div> : null}
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn("h-10", alignClass(col.align), col.className)}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key)}
                          className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                        >
                          {col.header}
                          {sort?.key === col.key ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )}
                        </button>
                      ) : (
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {col.header}
                        </span>
                      )}
                    </TableHead>
                  ))}
                  {rowActions ? <TableHead className="w-12 text-right" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={rowKey(row)}>
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn("py-3", alignClass(col.align), col.className)}
                      >
                        {col.cell(row)}
                      </TableCell>
                    ))}
                    {rowActions ? (
                      <TableCell className="py-3 text-right">{rowActions(row)}</TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {!loading && !error && totalCount > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground pt-1">
          <div className="flex items-center gap-4">
            <span>
              Hiển thị <span className="font-medium text-foreground">{startIdx}</span>–
              <span className="font-medium text-foreground">{endIdx}</span> trên{" "}
              <span className="font-medium text-foreground">{totalCount}</span> kết quả
            </span>

            {isServer && serverPagination?.onPageSizeChange ? (
              <div className="flex items-center gap-2">
                <span className="text-xs">Hiển thị:</span>
                <Select
                  value={String(effectivePageSize)}
                  onValueChange={(val) => serverPagination.onPageSizeChange?.(Number(val))}
                >
                  <SelectTrigger className="h-8 w-18 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(serverPagination.pageSizeOptions || [10, 20, 50, 100]).map((opt) => (
                      <SelectItem key={opt} value={String(opt)} className="text-xs">
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          {totalPages > 1 || isServer ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Trước
              </Button>
              <span className="tabular-nums text-xs font-medium px-2">
                Trang {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Sau
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
