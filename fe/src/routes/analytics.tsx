import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Minus,
  PieChart as PieIcon,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Warehouse,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { DateRangePicker, type DateRange } from "@/components/shared/date-range-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BestSellersChart,
  CategoryPieChart,
  OrdersLineChart,
  RevenueAreaChart,
  StockMovementChart,
} from "@/components/analytics/charts";
import { useBooks, useExportReceipts, useImportReceipts, useOrders } from "@/hooks/use-store";
import {
  buildReport,
  exportFullAnalyticsReport,
  growth,
  growthHint,
  reportRanges,
  type RangeKey,
} from "@/services/report-service";
import { formatCompactCurrency, formatCurrency, formatNumber } from "@/utils/format";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Thống kê & Báo cáo — BookStock" },
      {
        name: "description",
        content:
          "Báo cáo doanh thu, lợi nhuận gộp, đơn hàng, sách bán chạy và phân tích biến động kho theo thời gian.",
      },
      { property: "og:title", content: "Thống kê & Báo cáo — BookStock" },
      {
        property: "og:description",
        content: "Phân tích doanh thu, hiệu quả kinh doanh và cơ cấu kho sách.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const orders = useOrders();
  const books = useBooks();
  const imports = useImportReceipts();
  const exports = useExportReceipts();

  const [range, setRange] = useState<RangeKey>("30d");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const report = useMemo(
    () =>
      buildReport(
        orders,
        books,
        range,
        new Date(),
        dateRange?.from
          ? { from: dateRange.from, ...(dateRange.to ? { to: dateRange.to } : {}) }
          : undefined,
        imports,
        exports,
      ),
    [orders, books, range, dateRange, imports, exports],
  );

  const rangeLabel = dateRange?.from
    ? "Theo khoảng ngày đã chọn"
    : (reportRanges.find((r) => r.value === range)?.label ?? "30 ngày qua");

  const revenue = growthHint(report.current.revenue, report.previous.revenue);
  const profit = growthHint(report.current.grossProfit, report.previous.grossProfit);
  const orderCount = growthHint(report.current.orders, report.previous.orders);
  const units = growthHint(report.current.units, report.previous.units);

  const handleExport = () => {
    const filename = `bao-cao-kinh-doanh-${new Date().toISOString().slice(0, 10)}`;
    exportFullAnalyticsReport(filename, report, rangeLabel);
  };

  const hasData = report.current.orders > 0 || report.current.revenue > 0;

  return (
    <AppShell
      requiredAbility={{ action: "read", subject: "Revenue" }}
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Thống kê & Báo cáo" }]}
    >
      <PageContainer>
        <PageHeader
          title="Thống Kê & Báo Cáo"
          description={`Số liệu kinh doanh thực tế ${rangeLabel.toLowerCase()}, so sánh hiệu suất với kỳ liền trước.`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <DateRangePicker
                value={dateRange}
                onValueChange={setDateRange}
                placeholder="Chọn khoảng ngày"
              />
              <Select
                value={range}
                onValueChange={(v) => {
                  setDateRange(undefined);
                  setRange(v as RangeKey);
                }}
              >
                <SelectTrigger className="h-9 w-36" disabled={Boolean(dateRange?.from)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportRanges.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExport}
                disabled={!hasData}
                className="gap-1.5"
              >
                <Download className="h-4 w-4" /> Xuất báo cáo Excel (CSV)
              </Button>
            </div>
          }
        />

        {/* 4 Core Financial & Performance KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Doanh thu hoạt động"
            value={formatCurrency(report.current.revenue)}
            hint={revenue.hint}
            trend={revenue.trend}
            icon={Wallet}
          />
          <StatCard
            label="Lợi nhuận gộp ước tính"
            value={formatCurrency(report.current.grossProfit)}
            hint={`Biên LN: ${report.current.margin.toFixed(1)}% • ${profit.hint}`}
            trend={profit.trend}
            icon={TrendingUp}
          />
          <StatCard
            label="Tổng đơn hàng"
            value={`${formatNumber(report.current.orders)} đơn`}
            hint={orderCount.hint}
            trend={orderCount.trend}
            icon={ShoppingCart}
          />
          <StatCard
            label="Sách đã bán ra"
            value={`${formatNumber(report.current.units)} cuốn`}
            hint={units.hint}
            trend={units.trend}
            icon={BookOpen}
          />
        </div>

        {!hasData ? (
          <EmptyState
            title="Chưa có dữ liệu giao dịch trong kỳ này"
            description="Hãy chọn khoảng thời gian rộng hơn hoặc thực hiện các đơn hàng mới để xem phân tích chi tiết."
          />
        ) : (
          <div className="space-y-6">
            {/* Row 1: Revenue & Orders Timeline */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="shadow-none">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Doanh thu theo mốc thời gian</CardTitle>
                    <CardDescription className="text-xs">
                      Giá trị doanh thu phát sinh qua từng giai đoạn của kỳ
                    </CardDescription>
                  </div>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <RevenueAreaChart data={report.series} />
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Số lượng đơn hàng</CardTitle>
                    <CardDescription className="text-xs">
                      Tần suất đơn đặt hàng được tạo trong kỳ
                    </CardDescription>
                  </div>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <OrdersLineChart data={report.series} />
                </CardContent>
              </Card>
            </div>

            {/* Row 2: Real Stock Movement & Best Sellers */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="shadow-none">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Biến động Nhập / Xuất kho thực tế</CardTitle>
                    <CardDescription className="text-xs">
                      Số lượng cuốn nhập từ nhà cung cấp vs xuất bán trong kỳ
                    </CardDescription>
                  </div>
                  <Warehouse className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <StockMovementChart data={report.stockMovement} />
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Top 5 Sách bán chạy nhất</CardTitle>
                    <CardDescription className="text-xs">
                      Sản phẩm đóng góp số lượng bán cao nhất
                    </CardDescription>
                  </div>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <BestSellersChart data={report.bestSellers} />
                </CardContent>
              </Card>
            </div>

            {/* Row 3: Category Breakdown & Cashflow/Status */}
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="shadow-none lg:col-span-2">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Cơ cấu doanh thu theo Danh mục</CardTitle>
                    <CardDescription className="text-xs">
                      Tỷ trọng giá trị đóng góp từ các thể loại sách
                    </CardDescription>
                  </div>
                  <PieIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {report.byCategory.length > 0 ? (
                    <CategoryPieChart data={report.byCategory} />
                  ) : (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      Chưa có phân loại danh mục trong kỳ
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-none flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Cơ cấu dòng tiền & Trạng thái</CardTitle>
                  <CardDescription className="text-xs">
                    Tình trạng thu tiền và xử lý đơn hàng
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border p-3 bg-muted/20">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Đã thu tiền (Thanh toán xong)</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(report.current.paidRevenue)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Chờ thu tiền (COD / Chưa thanh toán)</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(report.current.pendingRevenue)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Phân bổ trạng thái đơn
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {report.byStatus.map((item) => (
                        <div
                          key={item.status}
                          className="rounded-md border p-2 flex items-center justify-between"
                        >
                          <span className="text-muted-foreground truncate">{item.label}</span>
                          <span className="font-bold tabular-nums ml-2">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3 bg-card flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Giá trị đơn trung bình</p>
                      <p className="text-base font-bold tabular-nums">
                        {formatCurrency(report.current.avgOrderValue)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Trị giá vốn tồn kho</p>
                      <p className="text-sm font-semibold tabular-nums text-primary">
                        {formatCompactCurrency(report.inventoryValue)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Comparison Table vs Previous Period */}
            <Card className="shadow-none">
              <CardHeader className="pb-3 border-b bg-muted/15">
                <CardTitle className="text-base flex items-center gap-2">
                  <Warehouse className="h-4 w-4 text-primary" /> Bảng so sánh hiệu suất với kỳ liền
                  trước
                </CardTitle>
                <CardDescription className="text-xs">
                  Đối chiếu chi tiết các chỉ số tài chính và vận hành giữa 2 kỳ liên tiếp
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Chỉ số kinh doanh</th>
                      <th className="py-3 px-4 text-right font-semibold">Kỳ này</th>
                      <th className="py-3 px-4 text-right font-semibold">Kỳ trước</th>
                      <th className="py-3 px-4 text-right font-semibold">
                        Chênh lệch / Tăng trưởng
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[
                      {
                        label: "Doanh thu hoạt động",
                        now: formatCurrency(report.current.revenue),
                        before: formatCurrency(report.previous.revenue),
                        diffVal: report.current.revenue - report.previous.revenue,
                        pct: growth(report.current.revenue, report.previous.revenue),
                      },
                      {
                        label: "Giá vốn hàng bán (COGS)",
                        now: formatCurrency(report.current.cogs),
                        before: formatCurrency(report.previous.cogs),
                        diffVal: report.current.cogs - report.previous.cogs,
                        pct: growth(report.current.cogs, report.previous.cogs),
                      },
                      {
                        label: "Lợi nhuận gộp ước tính",
                        now: formatCurrency(report.current.grossProfit),
                        before: formatCurrency(report.previous.grossProfit),
                        diffVal: report.current.grossProfit - report.previous.grossProfit,
                        pct: growth(report.current.grossProfit, report.previous.grossProfit),
                      },
                      {
                        label: "Biên lợi nhuận gộp",
                        now: `${report.current.margin.toFixed(1)}%`,
                        before: `${report.previous.margin.toFixed(1)}%`,
                        diffVal: report.current.margin - report.previous.margin,
                        pct: null,
                        isMargin: true,
                      },
                      {
                        label: "Số lượng đơn hàng",
                        now: `${formatNumber(report.current.orders)} đơn`,
                        before: `${formatNumber(report.previous.orders)} đơn`,
                        diffVal: report.current.orders - report.previous.orders,
                        pct: growth(report.current.orders, report.previous.orders),
                      },
                      {
                        label: "Sách đã bán",
                        now: `${formatNumber(report.current.units)} cuốn`,
                        before: `${formatNumber(report.previous.units)} cuốn`,
                        diffVal: report.current.units - report.previous.units,
                        pct: growth(report.current.units, report.previous.units),
                      },
                      {
                        label: "Giá trị đơn trung bình (AOV)",
                        now: formatCurrency(report.current.avgOrderValue),
                        before: formatCurrency(report.previous.avgOrderValue),
                        diffVal: report.current.avgOrderValue - report.previous.avgOrderValue,
                        pct: growth(report.current.avgOrderValue, report.previous.avgOrderValue),
                      },
                    ].map((row, idx) => {
                      const isUp = row.diffVal > 0;
                      const isDown = row.diffVal < 0;

                      return (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="py-3 px-4 font-medium">{row.label}</td>
                          <td className="py-3 px-4 text-right font-semibold tabular-nums">
                            {row.now}
                          </td>
                          <td className="py-3 px-4 text-right text-muted-foreground tabular-nums">
                            {row.before}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums font-medium">
                            <div className="flex items-center justify-end gap-1">
                              {isUp ? (
                                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                              ) : isDown ? (
                                <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
                              ) : (
                                <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              <span
                                className={
                                  isUp
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : isDown
                                      ? "text-rose-600 dark:text-rose-400"
                                      : "text-muted-foreground"
                                }
                              >
                                {row.isMargin
                                  ? `${row.diffVal >= 0 ? "+" : ""}${row.diffVal.toFixed(1)}% pts`
                                  : row.pct !== null
                                    ? `${row.pct >= 0 ? "+" : ""}${row.pct.toFixed(1)}%`
                                    : "—"}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
}
