import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownUp,
  Boxes,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  PackageX,
  Upload,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StockMovementChart } from "@/components/analytics/charts";
import { stockMovement } from "@/mock/inventory";
import {
  useBooks,
  useExportReceipts,
  useImportReceipts,
  useInventorySummary,
} from "@/hooks/use-store";
import {
  inventoryApi,
  type StockMovementApiItem,
  type StockAuditApiItem,
} from "@/lib/inventory-api";
import { exportBooksToExcel, exportMovementsToExcel } from "@/lib/excel-service";
import { formatCompactCurrency, formatCurrency, formatDate, formatNumber } from "@/utils/format";
import { bookStatusLabel, bookStatusTone } from "@/utils/status";
import { reorderSuggestions } from "@/services/report-service";
import { Can } from "@/lib/ability";
import type { Book, ExportReceipt, ImportReceipt } from "@/types";

export const Route = createFileRoute("/inventory/")({
  head: () => ({
    meta: [
      { title: "Kho hàng — BookStock" },
      {
        name: "description",
        content: "Tổng quan tồn kho, phiếu nhập, phiếu xuất, sổ kho và kiểm kê tồn kho.",
      },
      { property: "og:title", content: "Kho hàng — BookStock" },
      { property: "og:description", content: "Theo dõi tồn kho, nhập xuất và cảnh báo hết hàng." },
    ],
  }),
  component: InventoryPage,
});

const stockColumns: DataTableColumn<Book>[] = [
  {
    key: "title",
    header: "Sách",
    sortable: true,
    value: (b) => b.title,
    cell: (b) => <span className="font-medium">{b.title}</span>,
  },
  {
    key: "category",
    header: "Danh mục",
    cell: (b) => <span className="text-muted-foreground">{b.category}</span>,
  },
  {
    key: "stock",
    header: "Tồn kho",
    align: "right",
    sortable: true,
    value: (b) => b.stock,
    cell: (b) => <span className="tabular-nums font-semibold">{formatNumber(b.stock)}</span>,
  },
  {
    key: "min",
    header: "Tối thiểu",
    align: "right",
    cell: (b) => <span className="tabular-nums text-muted-foreground">{b.minStock}</span>,
  },
  {
    key: "value",
    header: "Giá trị tồn",
    align: "right",
    sortable: true,
    value: (b) => b.stock * b.purchasePrice,
    cell: (b) => <span className="tabular-nums">{formatCurrency(b.stock * b.purchasePrice)}</span>,
  },
  {
    key: "status",
    header: "Trạng thái",
    cell: (b) => (
      <StatusBadge tone={bookStatusTone[b.status]}>{bookStatusLabel[b.status]}</StatusBadge>
    ),
  },
];

const importColumns: DataTableColumn<ImportReceipt>[] = [
  {
    key: "id",
    header: "Mã phiếu",
    sortable: true,
    value: (r) => r.id,
    cell: (r) => <span className="font-mono text-xs font-semibold text-primary">{r.id}</span>,
  },
  {
    key: "supplier",
    header: "Nhà cung cấp",
    sortable: true,
    value: (r) => r.supplier,
    cell: (r) => <span className="font-medium">{r.supplier}</span>,
  },
  { key: "date", header: "Ngày nhập", cell: (r) => formatDate(r.date) },
  {
    key: "items",
    header: "Số lượng",
    align: "right",
    sortable: true,
    value: (r) => r.totalItems,
    cell: (r) => <span className="tabular-nums">{formatNumber(r.totalItems)}</span>,
  },
  {
    key: "value",
    header: "Giá trị",
    align: "right",
    sortable: true,
    value: (r) => r.totalValue,
    cell: (r) => <span className="tabular-nums font-medium">{formatCurrency(r.totalValue)}</span>,
  },
  {
    key: "note",
    header: "Ghi chú",
    cell: (r) => <span className="text-muted-foreground text-xs">{r.note || "—"}</span>,
  },
];

const exportColumns: DataTableColumn<ExportReceipt>[] = [
  {
    key: "id",
    header: "Mã phiếu",
    sortable: true,
    value: (r) => r.id,
    cell: (r) => <span className="font-mono text-xs font-semibold text-primary">{r.id}</span>,
  },
  {
    key: "order",
    header: "Đơn hàng",
    cell: (r) => <span className="font-mono text-xs">{r.orderId || "—"}</span>,
  },
  { key: "date", header: "Ngày xuất", cell: (r) => formatDate(r.date) },
  {
    key: "items",
    header: "Số lượng",
    align: "right",
    sortable: true,
    value: (r) => r.totalItems,
    cell: (r) => <span className="tabular-nums">{r.totalItems}</span>,
  },
  {
    key: "reason",
    header: "Lý do",
    cell: (r) => <span className="text-muted-foreground">{r.reason}</span>,
  },
  {
    key: "note",
    header: "Ghi chú",
    cell: (r) => <span className="text-muted-foreground text-xs">{r.note || "—"}</span>,
  },
];

const movementTypeMap: Record<
  string,
  { label: string; tone: "positive" | "negative" | "warning" | "neutral" | "brand" }
> = {
  IMPORT: { label: "Nhập kho", tone: "positive" },
  EXPORT: { label: "Xuất kho", tone: "negative" },
  SALE: { label: "Bán hàng", tone: "brand" },
  RESTOCK: { label: "Hoàn hàng", tone: "warning" },
  ADJUST: { label: "Kiểm kê/Cân bằng", tone: "neutral" },
};

const movementColumns: DataTableColumn<StockMovementApiItem>[] = [
  {
    key: "createdAt",
    header: "Thời gian",
    sortable: true,
    value: (m) => m.createdAt,
    cell: (m) => <span className="text-xs text-muted-foreground">{formatDate(m.createdAt)}</span>,
  },
  {
    key: "bookTitle",
    header: "Sách",
    sortable: true,
    value: (m) => m.bookTitle,
    cell: (m) => <span className="font-medium">{m.bookTitle}</span>,
  },
  {
    key: "type",
    header: "Loại giao dịch",
    cell: (m) => {
      const info = movementTypeMap[m.type] || { label: m.type, tone: "neutral" };
      return <StatusBadge tone={info.tone}>{info.label}</StatusBadge>;
    },
  },
  {
    key: "quantity",
    header: "Biến động",
    align: "right",
    sortable: true,
    value: (m) => m.quantity,
    cell: (m) => {
      const isPositive = m.type === "IMPORT" || m.type === "RESTOCK";
      return (
        <span
          className={`tabular-nums font-semibold ${isPositive ? "text-emerald-600" : "text-rose-600"}`}
        >
          {isPositive ? `+${m.quantity}` : `-${m.quantity}`}
        </span>
      );
    },
  },
  {
    key: "stockChange",
    header: "Tồn: Trước → Sau",
    align: "center",
    cell: (m) => (
      <span className="tabular-nums text-xs text-muted-foreground">
        {m.beforeStock} → <span className="font-semibold text-foreground">{m.afterStock}</span>
      </span>
    ),
  },
  {
    key: "referenceCode",
    header: "Chứng từ",
    cell: (m) => <span className="font-mono text-xs">{m.referenceCode || "—"}</span>,
  },
  {
    key: "note",
    header: "Diễn giải",
    cell: (m) => (
      <span className="text-muted-foreground text-xs truncate max-w-[200px] inline-block">
        {m.note || "—"}
      </span>
    ),
  },
];

function InventoryPage() {
  const books = useBooks();
  const imports = useImportReceipts();
  const exports = useExportReceipts();
  const inventorySummary = useInventorySummary();
  const reorders = useMemo(() => reorderSuggestions(books), [books]);

  // Query live stock movements from Backend API
  const { data: movementsData } = useQuery({
    queryKey: ["inventory", "movements"],
    queryFn: async () => {
      try {
        const res = await inventoryApi.listMovements({ size: 100 });
        return res?.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 10_000,
  });

  const movements = movementsData || [];

  return (
    <AppShell crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Kho hàng" }]}>
      <PageContainer>
        <PageHeader
          title="Kho hàng"
          description="Theo dõi tồn kho, phiếu nhập xuất, sổ kho và kiểm kê định kỳ."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => exportBooksToExcel(books)}>
                <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Xuất Excel Tồn kho
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportMovementsToExcel(movements as any)}
              >
                <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Xuất Sổ kho
              </Button>
              <Can I="create" a="StockMovement">
                <Button size="sm" variant="outline" asChild>
                  <Link to="/inventory/audit">
                    <ClipboardCheck className="mr-1.5 h-4 w-4" /> Kiểm kê kho
                  </Link>
                </Button>
              </Can>
              <Can I="create" a="ExportReceipt">
                <Button size="sm" variant="outline" asChild>
                  <Link to="/inventory/export">
                    <Upload className="mr-1.5 h-4 w-4" /> Xuất kho
                  </Link>
                </Button>
              </Can>
              <Can I="create" a="ImportReceipt">
                <Button size="sm" asChild>
                  <Link to="/inventory/import">
                    <Download className="mr-1.5 h-4 w-4" /> Nhập kho
                  </Link>
                </Button>
              </Can>
            </div>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Tổng tồn kho"
            value={formatNumber(inventorySummary.totalStock)}
            icon={Boxes}
          />
          <StatCard
            label="Sắp hết hàng"
            value={String(inventorySummary.lowStock)}
            hint="Cần nhập thêm"
            trend="down"
            icon={AlertTriangle}
          />
          <StatCard
            label="Hết hàng"
            value={String(inventorySummary.outOfStock)}
            trend="down"
            icon={PackageX}
          />
          <StatCard
            label="Giá trị kho"
            value={formatCompactCurrency(inventorySummary.inventoryValue)}
            hint="Theo giá nhập"
            icon={Wallet}
          />
        </div>

        {reorders.length > 0 ? (
          <Card className="border-warning/40 bg-warning/5 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Cảnh báo tồn kho — {reorders.length} đầu sách cần nhập thêm
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {reorders.slice(0, 5).map((b) => (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{b.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Tồn {formatNumber(b.stock)} / tối thiểu {b.minStock} — đề xuất nhập{" "}
                      <span className="font-medium text-foreground">
                        {formatNumber(b.suggestedQuantity)}
                      </span>{" "}
                      cuốn
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={bookStatusTone[b.status]}>
                      {bookStatusLabel[b.status]}
                    </StatusBadge>
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/inventory/import">Nhập kho</Link>
                    </Button>
                  </div>
                </div>
              ))}
              {reorders.length > 5 ? (
                <p className="text-xs text-muted-foreground">
                  và {reorders.length - 5} đầu sách khác đang dưới mức tồn tối thiểu.
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Biến động nhập / xuất kho</CardTitle>
          </CardHeader>
          <CardContent>
            <StockMovementChart data={stockMovement} />
          </CardContent>
        </Card>

        <Tabs defaultValue="stock">
          <TabsList>
            <TabsTrigger value="stock">Tồn kho</TabsTrigger>
            <TabsTrigger value="import">Phiếu nhập ({imports.length})</TabsTrigger>
            <TabsTrigger value="export">Phiếu xuất ({exports.length})</TabsTrigger>
            <TabsTrigger value="movements">
              <ArrowDownUp className="mr-1.5 h-3.5 w-3.5" /> Sổ kho ({movements.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="stock" className="pt-4">
            <DataTable columns={stockColumns} data={books} rowKey={(b) => b.id} />
          </TabsContent>
          <TabsContent value="import" className="pt-4">
            <DataTable columns={importColumns} data={imports} rowKey={(r) => r.id} />
          </TabsContent>
          <TabsContent value="export" className="pt-4">
            <DataTable columns={exportColumns} data={exports} rowKey={(r) => r.id} />
          </TabsContent>
          <TabsContent value="movements" className="pt-4">
            <DataTable columns={movementColumns} data={movements} rowKey={(m) => m.id} />
          </TabsContent>
        </Tabs>
      </PageContainer>
    </AppShell>
  );
}
