import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Boxes,
  CalendarDays,
  Clock,
  PackagePlus,
  ScanLine,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { DateRangePicker, inDateRange, DATE_PRESETS, type DateRange } from "@/components/shared/date-range-picker";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BestSellersChart,
  RevenueAreaChart,
  StockMovementChart,
} from "@/components/analytics/charts";
import { stockMovement as mockStockMovement } from "@/mock/inventory";
import {
  useBooks,
  useExportReceipts,
  useImportReceipts,
  useOrders,
} from "@/hooks/use-store";
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatNumber,
} from "@/utils/format";
import {
  bookStatusLabel,
  bookStatusTone,
  orderStatusLabel,
  orderStatusTone,
  paymentLabel,
  paymentTone,
} from "@/utils/status";
import type { Book, Order } from "@/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — BookStock" },
      {
        name: "description",
        content: "Tổng quan kho sách: tồn kho, đơn hàng, doanh thu và cảnh báo sắp hết hàng.",
      },
      { property: "og:title", content: "Dashboard — BookStock" },
      { property: "og:description", content: "Tổng quan kho sách, đơn hàng gần đây và cảnh báo tồn kho." },
    ],
  }),
  component: DashboardPage,
});

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
    cell: (o) => (
      <div>
        <p className="font-medium text-sm leading-none">{o.customerName}</p>
        {o.customerPhone && (
          <p className="text-xs text-muted-foreground mt-0.5">{o.customerPhone}</p>
        )}
      </div>
    ),
  },
  {
    key: "items",
    header: "SP",
    align: "right",
    cell: (o) => (o.items || []).reduce((s, i) => s + (i.quantity || 0), 0),
  },
  {
    key: "total",
    header: "Giá trị",
    align: "right",
    sortable: true,
    value: (o) => o.total,
    cell: (o) => <span className="tabular-nums font-semibold">{formatCurrency(o.total)}</span>,
  },
  {
    key: "payment",
    header: "Thanh toán",
    cell: (o) => (
      <StatusBadge tone={paymentTone[o.payment] || "neutral"}>
        {paymentLabel[o.payment] || o.payment || "Chưa thanh toán"}
      </StatusBadge>
    ),
  },
  {
    key: "status",
    header: "Trạng thái",
    cell: (o) => (
      <StatusBadge tone={orderStatusTone[o.status]}>
        {orderStatusLabel[o.status]}
      </StatusBadge>
    ),
  },
  {
    key: "date",
    header: "Ngày tạo",
    align: "right",
    cell: (o) => <span className="text-muted-foreground text-xs">{formatDate(o.createdAt)}</span>,
  },
  {
    key: "actions",
    header: "",
    align: "right",
    cell: (o) => (
      <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-xs">
        <Link to="/orders/$orderId" params={{ orderId: o.id }}>
          Chi tiết <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </Button>
    ),
  },
];

const lowStockColumns: DataTableColumn<Book>[] = [
  {
    key: "title",
    header: "Sách",
    sortable: true,
    value: (b) => b.title,
    cell: (b) => (
      <div>
        <p className="font-medium text-sm leading-snug">{b.title}</p>
        <p className="text-xs text-muted-foreground">{b.category || "Chưa phân loại"} • {b.author}</p>
      </div>
    ),
  },
  {
    key: "stock",
    header: "Tồn hiện tại",
    align: "right",
    sortable: true,
    value: (b) => b.stock,
    cell: (b) => (
      <span
        className={`tabular-nums font-bold ${
          b.stock === 0 ? "text-destructive" : "text-amber-600 dark:text-amber-400"
        }`}
      >
        {b.stock}
      </span>
    ),
  },
  {
    key: "min",
    header: "Tồn tối thiểu",
    align: "right",
    cell: (b) => <span className="tabular-nums text-muted-foreground">{b.minStock}</span>,
  },
  {
    key: "suggested",
    header: "Gợi ý nhập",
    align: "right",
    cell: (b) => (
      <span className="tabular-nums font-semibold text-primary">
        +{Math.max(b.minStock * 2 - b.stock, b.minStock || 10)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Trạng thái",
    cell: (b) => (
      <StatusBadge tone={bookStatusTone[b.status]}>
        {bookStatusLabel[b.status]}
      </StatusBadge>
    ),
  },
  {
    key: "actions",
    header: "",
    align: "right",
    cell: () => (
      <Button variant="outline" size="sm" asChild className="h-7 px-2.5 text-xs">
        <Link to="/inventory/import">
          <PackagePlus className="mr-1 h-3.5 w-3.5" /> Nhập hàng
        </Link>
      </Button>
    ),
  },
];

function DashboardPage() {
  const books = useBooks();
  const orders = useOrders();
  const imports = useImportReceipts();
  const exports = useExportReceipts();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Filter orders by date range if selected
  const periodOrders = useMemo(() => {
    if (!dateRange?.from) return orders;
    return orders.filter((o) => inDateRange(o.createdAt, dateRange));
  }, [orders, dateRange]);

  const recentOrders = useMemo(() => {
    return [...periodOrders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 7);
  }, [periodOrders]);

  // Inventory analysis
  const lowStockBooks = useMemo(
    () => books.filter((b) => b.status === "LOW_STOCK" || b.status === "OUT_OF_STOCK"),
    [books],
  );
  const outOfStockBooks = useMemo(
    () => books.filter((b) => b.status === "OUT_OF_STOCK" || b.stock === 0),
    [books],
  );

  // Financial & Order Metrics (Reacts dynamically to selected dateRange)
  const stats = useMemo(() => {
    const totalBooks = books.length;
    const totalStock = books.reduce((s, b) => s + (b.stock || 0), 0);
    const inventoryValue = books.reduce(
      (s, b) => s + (b.stock || 0) * (b.purchasePrice || b.price || 0),
      0,
    );

    // Active (non-cancelled) orders in current period
    const validOrders = periodOrders.filter((o) => o.status !== "CANCELLED");
    const activeRevenue = validOrders.reduce((s, o) => s + (o.total || 0), 0);

    // Confirmed/Paid/Delivered revenue
    const paidOrders = validOrders.filter(
      (o) => o.payment === "PAID" || o.status === "DELIVERED",
    );
    const paidRevenue = paidOrders.reduce((s, o) => s + (o.total || 0), 0);

    // Pending revenue (COD or awaiting payment)
    const pendingRevenue = activeRevenue - paidRevenue;

    // Cost of Goods Sold (COGS) estimation
    const bookMap = new Map(books.map((b) => [b.id, b]));
    const cogs = validOrders.reduce((acc, order) => {
      const orderCogs = (order.items || []).reduce((itemAcc, it) => {
        const bk = bookMap.get(it.bookId);
        const unitCost = bk?.purchasePrice || bk?.importPrice || (it.price || 0) * 0.7;
        return itemAcc + unitCost * (it.quantity || 0);
      }, 0);
      return acc + orderCogs;
    }, 0);

    const grossProfit = Math.max(0, activeRevenue - cogs);
    const profitMargin = activeRevenue > 0 ? (grossProfit / activeRevenue) * 100 : 0;

    // Order pipeline breakdown
    const deliveredCount = periodOrders.filter((o) => o.status === "DELIVERED").length;
    const pendingCount = periodOrders.filter(
      (o) => o.status === "PENDING" || o.status === "PREPARING" || o.status === "CONFIRMED",
    ).length;
    const shippingCount = periodOrders.filter((o) => o.status === "SHIPPING").length;
    const cancelledCount = periodOrders.filter((o) => o.status === "CANCELLED").length;

    const totalSoldUnits = validOrders.reduce(
      (s, o) => s + (o.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0),
      0,
    );

    return {
      totalBooks,
      totalStock,
      inventoryValue,
      totalOrders: periodOrders.length,
      activeRevenue,
      paidRevenue,
      pendingRevenue,
      grossProfit,
      profitMargin,
      totalSoldUnits,
      deliveredCount,
      pendingCount,
      shippingCount,
      cancelledCount,
    };
  }, [books, periodOrders]);

  // Dynamic Monthly / Period Revenue Series for Chart
  const revenueSeries = useMemo(() => {
    const months = 6;
    const now = new Date();
    const result: { period: string; revenue: number; orders: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `T${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
      const year = d.getFullYear();
      const month = d.getMonth();

      const matching = orders.filter((o) => {
        if (o.status === "CANCELLED") return false;
        const od = new Date(o.createdAt);
        return od.getFullYear() === year && od.getMonth() === month;
      });

      const rev = matching.reduce((s, o) => s + (o.total || 0), 0);
      result.push({
        period: label,
        revenue: rev,
        orders: matching.length,
      });
    }

    return result;
  }, [orders]);

  // Dynamic Best Sellers with correct key `sold`
  const bestSellers = useMemo(() => {
    const countMap = new Map<string, { title: string; sold: number }>();

    for (const o of periodOrders) {
      if (o.status === "CANCELLED") continue;
      for (const item of o.items || []) {
        const key = item.bookId || item.title;
        const entry = countMap.get(key) || { title: item.title, sold: 0 };
        entry.sold += item.quantity || 0;
        countMap.set(key, entry);
      }
    }

    const sorted = Array.from(countMap.values())
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);

    if (sorted.length === 0) {
      return books.slice(0, 5).map((b) => ({ title: b.title, sold: 0 }));
    }
    return sorted;
  }, [periodOrders, books]);

  // Dynamic Stock Movement based on actual import/export receipts + orders
  const stockMovementData = useMemo(() => {
    const months = 6;
    const now = new Date();
    const result: { month: string; nhap: number; xuat: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `T${String(d.getMonth() + 1).padStart(2, "0")}`;
      const year = d.getFullYear();
      const month = d.getMonth();

      // Imports in that month
      const impCount = imports
        .filter((imp) => {
          const id = new Date(imp.date);
          return id.getFullYear() === year && id.getMonth() === month;
        })
        .reduce((sum, imp) => sum + (imp.totalItems || 0), 0);

      // Exports in that month
      const expCount = exports
        .filter((exp) => {
          const ed = new Date(exp.date);
          return ed.getFullYear() === year && ed.getMonth() === month;
        })
        .reduce((sum, exp) => sum + (exp.totalItems || 0), 0);

      // Delivered orders in that month (stock dispatched)
      const orderSold = orders
        .filter((o) => {
          if (o.status === "CANCELLED") return false;
          const od = new Date(o.createdAt);
          return od.getFullYear() === year && od.getMonth() === month;
        })
        .reduce((sum, o) => sum + (o.items || []).reduce((n, it) => n + (it.quantity || 0), 0), 0);

      result.push({
        month: label,
        nhap: impCount,
        xuat: expCount + orderSold,
      });
    }

    const hasData = result.some((r) => r.nhap > 0 || r.xuat > 0);
    return hasData ? result : mockStockMovement;
  }, [imports, exports, orders]);

  // Resolve preset label for current dateRange
  const activePeriodLabel = useMemo(() => {
    if (!dateRange?.from) return null;
    for (const p of DATE_PRESETS) {
      const r = p.resolve();
      const fromMatch = r.from!.toDateString() === dateRange.from.toDateString();
      const toMatch = r.to && dateRange.to ? r.to.toDateString() === dateRange.to.toDateString() : !r.to && !dateRange.to;
      if (fromMatch && toMatch) return p.label;
    }
    const days = dateRange.to
      ? Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / 86400000) + 1
      : 1;
    return `${days} ngày`;
  }, [dateRange]);

  return (
    <AppShell crumbs={[{ label: "Dashboard" }]}>
      <PageContainer>
        <PageHeader
          title="Dashboard"
          description={
            <span className="flex items-center gap-2">
              Tổng quan hoạt động kho sách, doanh thu và đơn hàng.
              {activePeriodLabel && (
                <Badge variant="secondary" className="gap-1 text-xs font-medium">
                  <CalendarDays className="h-3 w-3" />
                  {activePeriodLabel}
                </Badge>
              )}
            </span>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <DateRangePicker
                value={dateRange}
                onValueChange={setDateRange}
                placeholder="Chọn khoảng ngày"
              />
              <Button size="sm" variant="outline" asChild>
                <Link to="/pos">
                  <ScanLine className="mr-1.5 h-4 w-4" /> POS
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/orders/create">
                  <ShoppingCart className="mr-1.5 h-4 w-4" /> Tạo đơn hàng
                </Link>
              </Button>
            </div>
          }
        />

        {/* Smart Low Stock Alert Banner */}
        {lowStockBooks.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-amber-500/20 p-1.5 mt-0.5 sm:mt-0 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Cảnh báo tồn kho cần chú ý</h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                    Có <strong>{outOfStockBooks.length}</strong> đầu sách đã hết hàng và{" "}
                    <strong>{lowStockBooks.length - outOfStockBooks.length}</strong> đầu sách chạm ngưỡng tối thiểu.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button size="sm" variant="outline" asChild className="h-8 text-xs bg-background/80 hover:bg-background">
                  <Link to="/inventory">Xem kho</Link>
                </Button>
                <Button size="sm" asChild className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-500">
                  <Link to="/inventory/import">
                    <PackagePlus className="mr-1.5 h-3.5 w-3.5" /> Tạo phiếu nhập
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}


        {/* 4 Core Financial & Inventory Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Doanh thu hoạt động"
            value={formatCompactCurrency(stats.activeRevenue)}
            hint={`Đã thu: ${formatCompactCurrency(stats.paidRevenue)} • Chờ thu: ${formatCompactCurrency(stats.pendingRevenue)}`}
            trend={stats.activeRevenue > 0 ? "up" : "neutral"}
            icon={Wallet}
          />
          <StatCard
            label="Lợi nhuận gộp ước tính"
            value={formatCompactCurrency(stats.grossProfit)}
            hint={`Biên LN: ${stats.profitMargin.toFixed(1)}% (Từ ${formatNumber(stats.totalSoldUnits)} cuốn)`}
            trend={stats.grossProfit > 0 ? "up" : "neutral"}
            icon={TrendingUp}
          />
          <StatCard
            label="Tổng đơn hàng"
            value={`${formatNumber(stats.totalOrders)} đơn`}
            hint={`${stats.deliveredCount} hoàn tất • ${stats.pendingCount + stats.shippingCount} đang xử lý`}
            trend={stats.totalOrders > 0 ? "up" : "neutral"}
            icon={ShoppingCart}
          />
          <StatCard
            label="Tồn kho lưu kho"
            value={`${formatNumber(stats.totalStock)} cuốn`}
            hint={`Trị giá vốn: ${formatCompactCurrency(stats.inventoryValue)} (${stats.totalBooks} đầu sách)`}
            trend={lowStockBooks.length > 0 ? "down" : "up"}
            icon={Boxes}
          />
        </div>

        {/* Order Status Pipeline Funnel */}
        <Card className="shadow-none border">
          <CardHeader className="py-3 px-5 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Tiến độ xử lý đơn hàng
              </CardTitle>
              <Link to="/orders" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                Tất cả đơn <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              <div className="rounded-lg border bg-card p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Chờ xử lý</span>
                  <span className="h-2 w-2 rounded-full bg-neutral-400" />
                </div>
                <div className="mt-2">
                  <p className="text-xl font-bold tabular-nums">
                    {periodOrders.filter((o) => o.status === "PENDING").length}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Đơn mới phát sinh</p>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Đang chuẩn bị</span>
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                </div>
                <div className="mt-2">
                  <p className="text-xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                    {periodOrders.filter((o) => o.status === "CONFIRMED" || o.status === "PREPARING").length}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Đang đóng gói hàng</p>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Đang giao hàng</span>
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                </div>
                <div className="mt-2">
                  <p className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                    {periodOrders.filter((o) => o.status === "SHIPPING").length}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Đơn vị vận chuyển giữ</p>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Giao thành công</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
                <div className="mt-2">
                  <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {periodOrders.filter((o) => o.status === "DELIVERED").length}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Đã thu tiền / hoàn tất</p>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-3 col-span-2 sm:col-span-4 lg:col-span-1 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Hủy / Hoàn</span>
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                </div>
                <div className="mt-2">
                  <p className="text-xl font-bold tabular-nums text-destructive">
                    {periodOrders.filter((o) => o.status === "CANCELLED" || o.status === "RETURNED" || o.status === "FAILED").length}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Hủy hoặc trả hàng</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Section */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="shadow-none lg:col-span-2">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Doanh thu & Xu hướng 6 tháng gần nhất</CardTitle>
                <CardDescription className="text-xs">
                  Biểu đồ giá trị đơn hàng thực tế theo từng tháng
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs h-7">
                <Link to="/analytics">
                  Chi tiết phân tích <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <RevenueAreaChart data={revenueSeries} />
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top 5 Sách bán chạy</CardTitle>
              <CardDescription className="text-xs">
                Xếp theo số lượng cuốn bán ra
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BestSellersChart data={bestSellers} />
            </CardContent>
          </Card>
        </div>

        {/* Inventory Stock Movement Chart */}
        <Card className="shadow-none">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Biến động Xuất / Nhập kho sách</CardTitle>
              <CardDescription className="text-xs">
                Số lượng cuốn nhập vào từ nhà cung cấp so với số lượng xuất bán & luân chuyển
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs h-7">
              <Link to="/inventory">
                Sổ kho chi tiết <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <StockMovementChart data={stockMovementData} />
          </CardContent>
        </Card>

        {/* Recent Orders Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">
                {dateRange?.from
                  ? `Đơn hàng trong khoảng ngày (${periodOrders.length})`
                  : "Đơn hàng gần đây"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Danh sách các đơn mới nhất cần xử lý hoặc theo dõi giao nhận
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/orders">Xem tất cả đơn</Link>
            </Button>
          </div>
          <DataTable
            columns={orderColumns}
            data={recentOrders}
            rowKey={(o) => o.id}
            pageSize={7}
            emptyTitle="Không có đơn hàng nào trong khoảng thời gian này"
          />
        </div>

        {/* Low Stock Warning Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <span>Cảnh báo tồn kho cần bổ sung</span>
                {lowStockBooks.length > 0 && (
                  <span className="rounded-full bg-destructive/15 text-destructive px-2 py-0.5 text-xs font-bold">
                    {lowStockBooks.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground">
                Các đầu sách đang dưới định mức an toàn hoặc đã hết hàng
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/inventory">Quản lý toàn bộ kho</Link>
            </Button>
          </div>
          <DataTable
            columns={lowStockColumns}
            data={lowStockBooks}
            rowKey={(b) => b.id}
            pageSize={5}
            emptyTitle="Kho hàng đảm bảo, không có sách sắp hết hàng"
          />
        </div>
      </PageContainer>
    </AppShell>
  );
}
