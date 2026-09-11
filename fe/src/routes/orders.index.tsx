import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  History,
  MoreHorizontal,
  Plus,
  ShoppingBag,
  User as UserIcon,
  XCircle,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { usePaginatedOrders } from "@/hooks/use-paginated-orders";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { orderService, orderTransitions } from "@/services/order-service";
import { orderApi } from "@/lib/order-api";
import { exportOrdersToExcel, exportOrderHistoriesToExcel } from "@/lib/excel-service";
import { downloadCsv } from "@/utils/csv";
import { formatCompactCurrency, formatCurrency, formatDate, formatDateTime } from "@/utils/format";
import { orderStatusLabel, orderStatusTone, paymentLabel, paymentTone } from "@/utils/status";
import { Can } from "@/lib/ability";
import type { Order, OrderHistoryItem } from "@/types";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "Đơn hàng & Nhật ký — BookStock" },
      {
        name: "description",
        content: "Danh sách đơn hàng và nhật ký thao tác audit log toàn hệ thống.",
      },
      { property: "og:title", content: "Đơn hàng & Nhật ký — BookStock" },
      {
        property: "og:description",
        content: "Theo dõi và xử lý toàn bộ đơn hàng và lịch sử thay đổi của cửa hàng sách.",
      },
    ],
  }),
  component: OrdersPage,
});

const ACTION_MAP: Record<
  string,
  { label: string; tone: "positive" | "info" | "warning" | "negative" | "brand" | "neutral" }
> = {
  CREATED: { label: "Tạo đơn", tone: "positive" },
  STATUS_CHANGE: { label: "Đổi trạng thái", tone: "info" },
  PAYMENT_CHANGE: { label: "Thanh toán", tone: "brand" },
  SEPAY_PAYMENT: { label: "SePay QR", tone: "positive" },
  GHN_SYNC: { label: "Đồng bộ GHN", tone: "warning" },
  UPDATED_INFO: { label: "Sửa thông tin", tone: "neutral" },
  NOTE_ADDED: { label: "Ghi chú nội bộ", tone: "warning" },
  CANCELLED: { label: "Hủy đơn", tone: "negative" },
};

function OrdersPage() {
  const [activeTab, setActiveTab] = useState<"orders" | "histories">("orders");

  // Orders table state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [totalRange, setTotalRange] = useState<PriceRange>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const debouncedSearch = useDebouncedValue(search);
  const resetPage = () => setPage(1);

  // Orders active filter chips
  const orderActiveFilters = useMemo<ActiveFilter[]>(() => {
    const chips: ActiveFilter[] = [];
    if (debouncedSearch)
      chips.push({
        key: "search",
        label: `Từ khóa: "${debouncedSearch}"`,
        onRemove: () => {
          setSearch("");
          resetPage();
        },
      });
    if (status !== "all")
      chips.push({
        key: "status",
        label: `Trạng thái: ${orderStatusLabel[status] ?? status}`,
        onRemove: () => {
          setStatus("all");
          resetPage();
        },
      });
    if (payment !== "all")
      chips.push({
        key: "payment",
        label: `Thanh toán: ${paymentLabel[payment] ?? payment}`,
        onRemove: () => {
          setPayment("all");
          resetPage();
        },
      });
    if (dateRange?.from) {
      const d = dateRange;
      const label = d.to
        ? `${d.from.toLocaleDateString("vi")} – ${d.to.toLocaleDateString("vi")}`
        : d.from.toLocaleDateString("vi");
      chips.push({
        key: "date",
        label: `Ngày tạo: ${label}`,
        onRemove: () => {
          setDateRange(undefined);
          resetPage();
        },
      });
    }
    if (totalRange.min !== undefined || totalRange.max !== undefined) {
      const label = [
        totalRange.min !== undefined ? `Từ ${formatCompactCurrency(totalRange.min)}` : null,
        totalRange.max !== undefined ? `đến ${formatCompactCurrency(totalRange.max)}` : null,
      ]
        .filter(Boolean)
        .join(" ");
      chips.push({
        key: "total",
        label: `Giá trị: ${label}`,
        onRemove: () => {
          setTotalRange({});
          resetPage();
        },
      });
    }
    return chips;
  }, [debouncedSearch, status, payment, dateRange, totalRange]);

  const clearOrderFilters = () => {
    setSearch("");
    setStatus("all");
    setPayment("all");
    setDateRange(undefined);
    setTotalRange({});
    setPage(1);
  };

  // Histories table state
  const [historySearch, setHistorySearch] = useState("");
  const [historyAction, setHistoryAction] = useState("all");
  const [historyDateRange, setHistoryDateRange] = useState<DateRange | undefined>(undefined);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(20);
  const debouncedHistorySearch = useDebouncedValue(historySearch);

  // Query paginated orders
  const { orders, pagination, isLoading, isFetching, error, refetch } = usePaginatedOrders({
    page,
    size: pageSize,
    search: debouncedSearch,
    status,
    payment,
    startDate: dateRange?.from ? dateRange.from.toISOString() : undefined,
    endDate: dateRange?.to ? dateRange.to.toISOString() : undefined,
  });

  // Query paginated order histories
  const {
    data: historiesData,
    isLoading: isLoadingHistories,
    isFetching: isFetchingHistories,
    refetch: refetchHistories,
  } = useQuery({
    queryKey: [
      "order-audit-logs",
      historyPage,
      historyPageSize,
      debouncedHistorySearch,
      historyAction,
      historyDateRange?.from,
      historyDateRange?.to,
    ],
    queryFn: async () => {
      try {
        const res = await orderApi.listHistories({
          page: historyPage,
          size: historyPageSize,
          search: debouncedHistorySearch || undefined,
          action: historyAction !== "all" ? historyAction : undefined,
          startDate: historyDateRange?.from ? historyDateRange.from.toISOString() : undefined,
          endDate: historyDateRange?.to ? historyDateRange.to.toISOString() : undefined,
        });
        return res || { data: [], pagination: { total: 0, page: 1, size: historyPageSize } };
      } catch (err) {
        console.warn("Failed to list order histories:", err);
        return { data: [], pagination: { total: 0, page: 1, size: historyPageSize } };
      }
    },
    staleTime: 10_000,
  });

  const histories = historiesData?.data || [];
  const historyPagination = historiesData?.pagination || {
    total: 0,
    page: 1,
    size: historyPageSize,
  };

  const exportCsv = () =>
    downloadCsv(`don-hang-${new Date().toISOString().slice(0, 10)}`, orders, [
      { header: "Mã đơn", value: (o) => o.orderCode || o.id },
      { header: "Khách hàng", value: (o) => o.customerName },
      { header: "Điện thoại", value: (o) => o.customerPhone },
      { header: "Số lượng", value: (o) => o.items.reduce((s, i) => s + i.quantity, 0) },
      { header: "Tổng tiền", value: (o) => o.total },
      { header: "Thanh toán", value: (o) => paymentLabel[o.payment] },
      { header: "Trạng thái", value: (o) => orderStatusLabel[o.status] },
      { header: "Ngày tạo", value: (o) => formatDate(o.createdAt) },
    ]);

  const orderColumns: DataTableColumn<Order>[] = [
    {
      key: "id",
      header: "Mã đơn",
      sortable: true,
      value: (o) => o.orderCode || o.id,
      cell: (o) => (
        <Link
          to="/orders/$orderId"
          params={{ orderId: o.id }}
          className="font-mono text-xs font-semibold text-primary hover:underline"
        >
          {o.orderCode || o.id}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Khách hàng",
      sortable: true,
      value: (o) => o.customerName,
      cell: (o) => <span className="font-medium">{o.customerName}</span>,
    },
    {
      key: "items",
      header: "SP",
      align: "right",
      cell: (o) => o.items.reduce((s, i) => s + i.quantity, 0),
    },
    {
      key: "total",
      header: "Tổng tiền",
      align: "right",
      sortable: true,
      value: (o) => o.total,
      cell: (o) => <span className="tabular-nums font-semibold">{formatCurrency(o.total)}</span>,
    },
    {
      key: "payment",
      header: "Thanh toán",
      cell: (o) => (
        <StatusBadge tone={paymentTone[o.payment]}>{paymentLabel[o.payment]}</StatusBadge>
      ),
    },
    {
      key: "shipping",
      header: "Vận chuyển",
      cell: (o) => <span className="text-muted-foreground text-xs">{o.shippingMethod}</span>,
    },
    {
      key: "status",
      header: "Trạng thái",
      cell: (o) => (
        <StatusBadge tone={orderStatusTone[o.status]}>{orderStatusLabel[o.status]}</StatusBadge>
      ),
    },
    {
      key: "createdAt",
      header: "Ngày tạo",
      align: "right",
      sortable: true,
      value: (o) => o.createdAt,
      cell: (o) => <span className="text-muted-foreground text-xs">{formatDate(o.createdAt)}</span>,
    },
  ];

  const historyColumns: DataTableColumn<OrderHistoryItem>[] = [
    {
      key: "createdAt",
      header: "Thời gian",
      sortable: true,
      value: (h) => h.createdAt,
      cell: (h) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDateTime(h.createdAt)}
        </span>
      ),
    },
    {
      key: "orderCode",
      header: "Mã đơn hàng",
      sortable: true,
      value: (h) => h.orderCode,
      cell: (h) => (
        <Link
          to="/orders/$orderId"
          params={{ orderId: h.orderCode || String(h.orderId) }}
          className="font-mono text-xs font-semibold text-primary hover:underline"
        >
          {h.orderCode}
        </Link>
      ),
    },
    {
      key: "action",
      header: "Loại thao tác",
      cell: (h) => {
        const info = ACTION_MAP[h.action] || { label: h.action, tone: "neutral" };
        return <StatusBadge tone={info.tone}>{info.label}</StatusBadge>;
      },
    },
    {
      key: "title",
      header: "Hành động",
      cell: (h) => <span className="font-medium text-xs text-foreground">{h.title}</span>,
    },
    {
      key: "actor",
      header: "Người thực hiện",
      cell: (h) => (
        <div className="flex items-center gap-1.5 text-xs text-foreground/90">
          <UserIcon className="h-3 w-3 text-muted-foreground" />
          <span>{h.actor || "Hệ thống"}</span>
        </div>
      ),
    },
    {
      key: "statusChange",
      header: "Trạng thái",
      cell: (h) => {
        if (!h.toStatus) return <span className="text-muted-foreground text-xs">—</span>;
        if (h.fromStatus && h.fromStatus !== h.toStatus) {
          return (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground text-[11px]">
                {orderStatusLabel[h.fromStatus as any] || h.fromStatus}
              </span>
              <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
              <span className="font-medium text-primary">
                {orderStatusLabel[h.toStatus as any] || h.toStatus}
              </span>
            </div>
          );
        }
        return (
          <span className="text-xs text-muted-foreground">
            {orderStatusLabel[h.toStatus as any] || h.toStatus}
          </span>
        );
      },
    },
    {
      key: "note",
      header: "Diễn giải / Ghi chú",
      cell: (h) => (
        <span className="text-muted-foreground text-xs truncate max-w-[260px] inline-block">
          {h.note || "—"}
        </span>
      ),
    },
  ];

  return (
    <AppShell crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Đơn hàng" }]}>
      <PageContainer>
        <PageHeader
          title="Đơn hàng & Nhật ký"
          description="Quản lý vòng đời đơn hàng, vận chuyển và theo dõi toàn bộ lịch sử thao tác audit log."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportOrdersToExcel(orders)}
                disabled={orders.length === 0}
              >
                <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Xuất Excel Đơn
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportOrderHistoriesToExcel(histories)}
                disabled={histories.length === 0}
              >
                <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Xuất Nhật ký
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={exportCsv}
                disabled={orders.length === 0}
              >
                <Download className="mr-1.5 h-4 w-4" /> Xuất CSV
              </Button>
              <Can I="create" a="BookstoreOrder">
                <Button size="sm" asChild>
                  <Link to="/orders/create">
                    <Plus className="mr-1.5 h-4 w-4" /> Tạo đơn hàng
                  </Link>
                </Button>
              </Can>
            </div>
          }
        />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="orders" className="gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5" />
              Danh sách đơn hàng ({pagination.total})
            </TabsTrigger>
            <TabsTrigger value="histories" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Nhật ký thao tác ({historyPagination.total})
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: DANH SÁCH ĐƠN HÀNG ── */}
          <TabsContent value="orders" className="pt-4 space-y-4">
            <DataTable
              columns={orderColumns}
              data={orders}
              rowKey={(o) => o.id}
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
              emptyTitle="Không tìm thấy đơn hàng nào"
              emptyDescription="Thử thay đổi bộ lọc hoặc tạo đơn hàng mới."
              toolbar={
                <div className="space-y-2">
                  <FilterBar>
                    <SearchInput
                      className="sm:w-64"
                      value={search}
                      onValueChange={(val) => {
                        setSearch(val);
                        resetPage();
                      }}
                      placeholder="Tìm mã đơn, khách hàng..."
                    />
                    <DateRangePicker
                      value={dateRange}
                      onValueChange={(val) => {
                        setDateRange(val);
                        resetPage();
                      }}
                      placeholder="Ngày tạo"
                    />
                    <Select
                      value={status}
                      onValueChange={(val) => {
                        setStatus(val);
                        resetPage();
                      }}
                    >
                      <SelectTrigger className="h-9 sm:w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả trạng thái</SelectItem>
                        {Object.entries(orderStatusLabel).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={payment}
                      onValueChange={(val) => {
                        setPayment(val);
                        resetPage();
                      }}
                    >
                      <SelectTrigger className="h-9 sm:w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả thanh toán</SelectItem>
                        {Object.entries(paymentLabel).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <PriceRangeFilter
                      value={totalRange}
                      onValueChange={(r) => {
                        setTotalRange(r);
                        resetPage();
                      }}
                      label="Giá trị đơn"
                    />
                  </FilterBar>
                  <ActiveFilterChips filters={orderActiveFilters} onClearAll={clearOrderFilters} />
                </div>
              }
              rowActions={(o) => <OrderRowActions order={o} onStatusChanged={refetch} />}
            />
            {isFetching && !isLoading && (
              <p className="text-xs text-muted-foreground animate-pulse">
                Đang cập nhật dữ liệu...
              </p>
            )}
          </TabsContent>

          {/* ── TAB 2: NHẬT KÝ THAO TÁC (AUDIT LOGS) ── */}
          <TabsContent value="histories" className="pt-4 space-y-4">
            <DataTable
              columns={historyColumns}
              data={histories}
              rowKey={(h) => h.id}
              pageSize={historyPageSize}
              loading={isLoadingHistories}
              serverPagination={{
                total: historyPagination.total,
                page: historyPage,
                pageSize: historyPageSize,
                onPageChange: (newPage) => setHistoryPage(newPage),
                onPageSizeChange: (newSize) => {
                  setHistoryPageSize(newSize);
                  setHistoryPage(1);
                },
                pageSizeOptions: [10, 20, 50, 100],
              }}
              emptyTitle="Chưa có nhật ký thao tác nào"
              emptyDescription="Các hành động tạo đơn, đổi trạng thái, thanh toán SePay và ghi chú sẽ xuất hiện tại đây."
              toolbar={
                <FilterBar>
                  <SearchInput
                    className="sm:w-72"
                    value={historySearch}
                    onValueChange={(val) => {
                      setHistorySearch(val);
                      setHistoryPage(1);
                    }}
                    placeholder="Tìm mã đơn, người thao tác, ghi chú..."
                  />
                  <DateRangePicker
                    value={historyDateRange}
                    onValueChange={(val) => {
                      setHistoryDateRange(val);
                      setHistoryPage(1);
                    }}
                    placeholder="Lọc theo ngày"
                  />
                  <Select
                    value={historyAction}
                    onValueChange={(val) => {
                      setHistoryAction(val);
                      setHistoryPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 sm:w-48">
                      <SelectValue placeholder="Loại thao tác" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả thao tác</SelectItem>
                      {Object.entries(ACTION_MAP).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterBar>
              }
            />
            {isFetchingHistories && !isLoadingHistories && (
              <p className="text-xs text-muted-foreground animate-pulse">
                Đang cập nhật nhật ký thao tác...
              </p>
            )}
          </TabsContent>
        </Tabs>
      </PageContainer>
    </AppShell>
  );
}

function OrderRowActions({
  order,
  onStatusChanged,
}: {
  order: Order;
  onStatusChanged?: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const next = orderTransitions[order.status]?.find((t) => t !== "CANCELLED" && t !== "FAILED");
  const canCancel = orderTransitions[order.status]?.includes("CANCELLED");

  const advance = async () => {
    if (!next) return;
    const res = await orderService.updateStatus(order.id, next);
    if (res.ok) {
      toast.success(`Đơn ${order.orderCode || order.id} → ${orderStatusLabel[next]}`);
      onStatusChanged?.();
    } else {
      toast.error(res.error ?? "Không thể cập nhật");
    }
  };

  const cancel = async () => {
    const res = await orderService.updateStatus(order.id, "CANCELLED");
    if (res.ok) {
      toast.success("Đã hủy đơn và hoàn lại tồn kho");
      onStatusChanged?.();
    } else {
      toast.error(res.error ?? "Không thể hủy đơn");
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
          <DropdownMenuItem asChild>
            <Link to="/orders/$orderId" params={{ orderId: order.id }}>
              <Eye className="mr-2 h-4 w-4" /> Xem chi tiết & Timeline
            </Link>
          </DropdownMenuItem>
          {next ? (
            <DropdownMenuItem onSelect={() => void advance()}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Chuyển sang {orderStatusLabel[next]}
            </DropdownMenuItem>
          ) : null}
          {canCancel ? (
            <DropdownMenuItem className="text-destructive" onSelect={() => setConfirmOpen(true)}>
              <XCircle className="mr-2 h-4 w-4" /> Hủy đơn
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hủy đơn hàng này?"
        description={`Đơn ${order.orderCode || order.id} sẽ chuyển sang trạng thái Đã hủy và số lượng được hoàn lại kho.`}
        confirmLabel="Hủy đơn"
        onConfirm={() => void cancel()}
      />
    </>
  );
}
