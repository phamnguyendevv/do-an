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
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.value) return data;
    return [...data].sort((a, b) => {
      const av = col.value!(a);
      const bv = col.value!(b);
      const res = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? res : -res;
    });
  }, [data, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, totalPages);
  const rows = sorted.slice((current - 1) * pageSize, current * pageSize);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const alignClass = (align?: string) =>
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  return (
    <div className="space-y-3">
      {toolbar}

      {error ? (
        <ErrorState message={error} />
      ) : loading ? (
        <LoadingState rows={5} />
      ) : sorted.length === 0 ? (
        <EmptyState title={emptyTitle} {...(emptyDescription ? { description: emptyDescription } : {})} />
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
                      <span className="min-w-0 break-words text-right text-sm">{col.cell(row)}</span>
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
                  <TableHead key={col.key} className={cn("h-10", alignClass(col.align), col.className)}>
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                      >
                        {col.header}
                        {sort?.key === col.key ? (
                          sort.dir === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-50" />
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
                    <TableCell key={col.key} className={cn("py-3", alignClass(col.align), col.className)}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                  {rowActions ? <TableCell className="py-3 text-right">{rowActions(row)}</TableCell> : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        </>
      )}

      {!loading && !error && sorted.length > pageSize ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, sorted.length)} / {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="tabular-nums">
              {current} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={current === totalPages}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
