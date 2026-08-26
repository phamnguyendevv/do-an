import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Boxes, ShoppingCart, Wallet } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { DateRangePicker, inDateRange, type DateRange } from "@/components/shared/date-range-picker";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BestSellersChart,
  RevenueAreaChart,
  StockMovementChart,
} from "@/components/analytics/charts";
import { dashboardStats, bestSellers, revenueSeries } from "@/mock/analytics";
import { stockMovement } from "@/mock/inventory";
import { useBooks, useOrders } from "@/hooks/use-store";
import { formatCompactCurrency, formatCurrency, formatDate, formatNumber } from "@/utils/format";
import { bookStatusLabel, bookStatusTone, orderStatusLabel, orderStatusTone } from "@/utils/status";
import type { Book, Order } from "@/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — BookStock" },
      { name: "description", content: "Tổng quan kho sách: tồn kho, đơn hàng, doanh thu và cảnh báo sắp hết hàng." },
      { property: "og:title", content: "Dashboard — BookStock" },
      { property: "og:description", content: "Tổng quan kho sách, đơn hàng gần đây và cảnh báo tồn kho." },
    ],
  }),
  component: DashboardPage,
});

const orderColumns: DataTableColumn<Order>[] = [
  { key: "id", header: "Mã đơn", sortable: true, value: (o) => o.id, cell: (o) => <span className="font-mono text-xs">{o.id}</span> },
  { key: "customer", header: "Khách hàng", sortable: true, value: (o) => o.customerName, cell: (o) => <span className="font-medium">{o.customerName}</span> },
  { key: "items", header: "SP", align: "right", cell: (o) => o.items.reduce((s, i) => s + i.quantity, 0) },
  { key: "total", header: "Giá trị", align: "right", sortable: true, value: (o) => o.total, cell: (o) => <span className="tabular-nums">{formatCurrency(o.total)}</span> },
  { key: "status", header: "Trạng thái", cell: (o) => <StatusBadge tone={orderStatusTone[o.status]}>{orderStatusLabel[o.status]}</StatusBadge> },
  { key: "date", header: "Ngày tạo", align: "right", cell: (o) => <span className="text-muted-foreground">{formatDate(o.createdAt)}</span> },
];

const lowStockColumns: DataTableColumn<Book>[] = [
  { key: "title", header: "Sách", sortable: true, value: (b) => b.title, cell: (b) => <span className="font-medium">{b.title}</span> },
  { key: "stock", header: "Tồn hiện tại", align: "right", sortable: true, value: (b) => b.stock, cell: (b) => <span className="tabular-nums">{b.stock}</span> },
  { key: "min", header: "Tồn tối thiểu", align: "right", cell: (b) => <span className="tabular-nums text-muted-foreground">{b.minStock}</span> },
  { key: "status", header: "Trạng thái", cell: (b) => <StatusBadge tone={bookStatusTone[b.status]}>{bookStatusLabel[b.status]}</StatusBadge> },
];

function DashboardPage() {
  const books = useBooks();
  const orders = useOrders();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const filteredOrders = useMemo(
    () => orders.filter((o) => inDateRange(o.createdAt, dateRange)),
    [orders, dateRange],
  );
  const recentOrders = dateRange?.from ? filteredOrders : orders.slice(0, 6);
  const lowStock = books.filter((b) => b.status !== "IN_STOCK");

  return (
    <AppShell crumbs={[{ label: "Dashboard" }]}>
      <PageContainer>
        <PageHeader
          title="Dashboard"
          description="Tổng quan hoạt động kho sách trong tháng này."
          actions={
            <>
              <DateRangePicker value={dateRange} onValueChange={setDateRange} />
              <Button size="sm" asChild>
                <Link to="/orders/create">Tạo đơn hàng</Link>
              </Button>
            </>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Tổng sách" value={formatNumber(dashboardStats.totalBooks)} hint="+24 đầu sách mới" trend="up" icon={BookOpen} />
          <StatCard label="Tồn kho" value={formatNumber(dashboardStats.totalStock)} hint="Cập nhật hôm nay" icon={Boxes} />
          <StatCard label="Đơn hàng" value={formatNumber(dashboardStats.totalOrders)} hint="+8,2% so với tháng trước" trend="up" icon={ShoppingCart} />
          <StatCard label="Doanh thu" value={formatCompactCurrency(dashboardStats.revenue)} hint="+11,1% so với tháng trước" trend="up" icon={Wallet} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="shadow-none lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Doanh thu 6 tháng</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueAreaChart data={revenueSeries} />
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sách bán chạy</CardTitle>
            </CardHeader>
            <CardContent>
              <BestSellersChart data={bestSellers} />
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Nhập / xuất kho</CardTitle>
          </CardHeader>
          <CardContent>
            <StockMovementChart data={stockMovement} />
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {dateRange?.from ? `Đơn hàng theo ngày đã chọn (${filteredOrders.length})` : "Đơn hàng gần đây"}
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/orders">Xem tất cả</Link>
            </Button>
          </div>
          <DataTable columns={orderColumns} data={recentOrders} rowKey={(o) => o.id} pageSize={6} emptyTitle="Không có đơn hàng trong khoảng ngày này" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Cảnh báo tồn kho</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/inventory">Quản lý kho</Link>
            </Button>
          </div>
          <DataTable
            columns={lowStockColumns}
            data={lowStock}
            rowKey={(b) => b.id}
            pageSize={5}
            emptyTitle="Không có sách sắp hết hàng"
          />
        </div>
      </PageContainer>
    </AppShell>
  );
}
