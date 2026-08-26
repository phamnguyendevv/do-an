import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Download, Eye, MoreHorizontal, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterBar } from "@/components/shared/filter-bar";
import { DateRangePicker, inDateRange, type DateRange } from "@/components/shared/date-range-picker";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
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
import { useOrders } from "@/hooks/use-store";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { orderService, orderTransitions } from "@/services/order-service";
import { downloadCsv } from "@/utils/csv";
import { formatCurrency, formatDate } from "@/utils/format";
import {
  orderStatusLabel,
  orderStatusTone,
  paymentLabel,
  paymentTone,
} from "@/utils/status";
import type { Order } from "@/types";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "Đơn hàng — BookStock" },
      { name: "description", content: "Danh sách đơn hàng: trạng thái, thanh toán, vận chuyển và giá trị đơn." },
      { property: "og:title", content: "Đơn hàng — BookStock" },
      { property: "og:description", content: "Theo dõi và xử lý toàn bộ đơn hàng của cửa hàng sách." },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const orders = useOrders();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const debouncedSearch = useDebouncedValue(search);

  const data = useMemo(
    () =>
      orders.filter((o) => {
        const q = debouncedSearch.trim().toLowerCase();
        const matchQ =
          !q || o.id.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q);
        return (
          matchQ &&
          (status === "all" || o.status === status) &&
          (payment === "all" || o.payment === payment) &&
          inDateRange(o.createdAt, dateRange)
        );
      }),
    [orders, debouncedSearch, status, payment, dateRange],
  );

  const exportCsv = () =>
    downloadCsv(`don-hang-${new Date().toISOString().slice(0, 10)}`, data, [
      { header: "Mã đơn", value: (o) => o.id },
      { header: "Khách hàng", value: (o) => o.customerName },
      { header: "Điện thoại", value: (o) => o.customerPhone },
      { header: "Số lượng", value: (o) => o.items.reduce((s, i) => s + i.quantity, 0) },
      { header: "Tổng tiền", value: (o) => o.total },
      { header: "Thanh toán", value: (o) => paymentLabel[o.payment] },
      { header: "Trạng thái", value: (o) => orderStatusLabel[o.status] },
      { header: "Ngày tạo", value: (o) => formatDate(o.createdAt) },
    ]);

  const columns: DataTableColumn<Order>[] = [
    {
      key: "id",
      header: "Mã đơn",
      sortable: true,
      value: (o) => o.id,
      cell: (o) => (
        <Link to="/orders/$orderId" params={{ orderId: o.id }} className="font-mono text-xs hover:text-primary">
          {o.id}
        </Link>
      ),
    },
    { key: "customer", header: "Khách hàng", sortable: true, value: (o) => o.customerName, cell: (o) => <span className="font-medium">{o.customerName}</span> },
    { key: "items", header: "SP", align: "right", cell: (o) => o.items.reduce((s, i) => s + i.quantity, 0) },
    { key: "total", header: "Tổng tiền", align: "right", sortable: true, value: (o) => o.total, cell: (o) => <span className="tabular-nums">{formatCurrency(o.total)}</span> },
    { key: "payment", header: "Thanh toán", cell: (o) => <StatusBadge tone={paymentTone[o.payment]}>{paymentLabel[o.payment]}</StatusBadge> },
    { key: "shipping", header: "Vận chuyển", cell: (o) => <span className="text-muted-foreground">{o.shippingMethod}</span> },
    { key: "status", header: "Trạng thái", cell: (o) => <StatusBadge tone={orderStatusTone[o.status]}>{orderStatusLabel[o.status]}</StatusBadge> },
    { key: "createdAt", header: "Ngày tạo", align: "right", sortable: true, value: (o) => o.createdAt, cell: (o) => <span className="text-muted-foreground">{formatDate(o.createdAt)}</span> },
  ];

  return (
    <AppShell crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Đơn hàng" }]}>
      <PageContainer>
        <PageHeader
          title="Đơn hàng"
          description={`${orders.length} đơn hàng trong hệ thống.`}
          actions={
            <>
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={data.length === 0}>
              <Download className="mr-1.5 h-4 w-4" /> Xuất CSV
            </Button>
            <Button size="sm" asChild>
              <Link to="/orders/create">
                <Plus className="mr-1.5 h-4 w-4" /> Tạo đơn hàng
              </Link>
            </Button>
            </>
          }
        />

        <DataTable
          columns={columns}
          data={data}
          rowKey={(o) => o.id}
          emptyTitle="No orders found"
          emptyDescription="Thử thay đổi bộ lọc hoặc tạo đơn hàng mới."
          toolbar={
            <FilterBar>
              <SearchInput
                className="sm:w-72"
                value={search}
                onValueChange={setSearch}
                placeholder="Tìm mã đơn, khách hàng..."
              />
              <DateRangePicker value={dateRange} onValueChange={setDateRange} placeholder="Lọc theo ngày tạo" />
              <Select value={status} onValueChange={setStatus}>
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
              <Select value={payment} onValueChange={setPayment}>
                <SelectTrigger className="h-9 sm:w-44">
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
            </FilterBar>
          }
          rowActions={(o) => <OrderRowActions order={o} />}
        />
      </PageContainer>
    </AppShell>
  );
}

function OrderRowActions({ order }: { order: Order }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const next = orderTransitions[order.status].find((t) => t !== "CANCELLED" && t !== "FAILED");
  const canCancel = orderTransitions[order.status].includes("CANCELLED");

  const advance = async () => {
    if (!next) return;
    const res = await orderService.updateStatus(order.id, next);
    if (res.ok) toast.success(`Đơn ${order.id} → ${orderStatusLabel[next]}`);
    else toast.error(res.error ?? "Không thể cập nhật");
  };

  const cancel = async () => {
    const res = await orderService.updateStatus(order.id, "CANCELLED");
    if (res.ok) toast.success("Đã hủy đơn và hoàn lại tồn kho");
    else toast.error(res.error ?? "Không thể hủy đơn");
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
              <Eye className="mr-2 h-4 w-4" /> Xem chi tiết
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
        description={`Đơn ${order.id} sẽ chuyển sang trạng thái Đã hủy và số lượng được hoàn lại kho.`}
        confirmLabel="Hủy đơn"
        onConfirm={() => void cancel()}
      />
    </>
  );
}
