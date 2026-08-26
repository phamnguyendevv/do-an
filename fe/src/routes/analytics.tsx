import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Download, Receipt, ShoppingCart, Wallet, Warehouse } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { DateRangePicker, type DateRange } from "@/components/shared/date-range-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { stockMovement } from "@/mock/inventory";
import { useBooks, useOrders } from "@/hooks/use-store";
import {
  buildReport,
  growthHint,
  reportRanges,
  type RangeKey,
} from "@/services/report-service";
import { downloadCsv } from "@/utils/csv";
import { formatCompactCurrency, formatCurrency, formatNumber } from "@/utils/format";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Thống kê — BookStock" },
      { name: "description", content: "Báo cáo doanh thu, đơn hàng, sách bán chạy và giá trị tồn kho theo thời gian." },
      { property: "og:title", content: "Thống kê — BookStock" },
      { property: "og:description", content: "Phân tích doanh thu và hiệu quả kinh doanh của kho sách." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const orders = useOrders();
  const books = useBooks();
  const [range, setRange] = useState<RangeKey>("30d");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const report = useMemo(
    () =>
      buildReport(
        orders,
        books,
        range,
        new Date(),
        dateRange?.from ? { from: dateRange.from, ...(dateRange.to ? { to: dateRange.to } : {}) } : undefined,
      ),
    [orders, books, range, dateRange],
  );
  const rangeLabel = dateRange?.from
    ? "theo khoảng ngày đã chọn"
    : (reportRanges.find((r) => r.value === range)?.label ?? "");

  const revenue = growthHint(report.current.revenue, report.previous.revenue);
  const orderCount = growthHint(report.current.orders, report.previous.orders);
  const units = growthHint(report.current.units, report.previous.units);

  const exportReport = () =>
    downloadCsv(`bao-cao-${range}-${new Date().toISOString().slice(0, 10)}`, report.series, [
      { header: "Kỳ", value: (p) => p.period },
      { header: "Doanh thu", value: (p) => p.revenue },
      { header: "Số đơn", value: (p) => p.orders },
    ]);

  const hasData = report.current.orders > 0;

  return (
    <AppShell requiredRole="ADMIN" crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Thống kê" }]}>
      <PageContainer>
        <PageHeader
          title="Thống kê"
          description={`Số liệu thực tế ${rangeLabel.toLowerCase()} gần nhất, so sánh với kỳ liền trước.`}
          actions={
            <>
              <DateRangePicker value={dateRange} onValueChange={setDateRange} />
              <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
                <SelectTrigger className="h-9 w-40" disabled={Boolean(dateRange?.from)}>
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
              <Button size="sm" variant="outline" onClick={exportReport} disabled={!hasData}>
                <Download className="mr-1.5 h-4 w-4" /> Xuất báo cáo
              </Button>
            </>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Doanh thu"
            value={formatCompactCurrency(report.current.revenue)}
            hint={revenue.hint}
            trend={revenue.trend}
            icon={Wallet}
          />
          <StatCard
            label="Đơn hàng"
            value={formatNumber(report.current.orders)}
            hint={orderCount.hint}
            trend={orderCount.trend}
            icon={ShoppingCart}
          />
          <StatCard
            label="Sách đã bán"
            value={formatNumber(report.current.units)}
            hint={units.hint}
            trend={units.trend}
            icon={BookOpen}
          />
          <StatCard
            label="Giá trị đơn trung bình"
            value={formatCurrency(report.current.avgOrderValue)}
            hint={`Tồn kho: ${formatCompactCurrency(report.inventoryValue)}`}
            icon={Receipt}
          />
        </div>

        {!hasData ? (
          <EmptyState
            title="Chưa có dữ liệu trong kỳ này"
            description="Hãy chọn khoảng thời gian rộng hơn hoặc tạo đơn hàng mới."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Doanh thu theo kỳ</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueAreaChart data={report.series} />
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Số đơn theo kỳ</CardTitle>
              </CardHeader>
              <CardContent>
                <OrdersLineChart data={report.series} />
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Biến động tồn kho</CardTitle>
              </CardHeader>
              <CardContent>
                <StockMovementChart data={stockMovement} />
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Sách bán chạy</CardTitle>
              </CardHeader>
              <CardContent>
                <BestSellersChart data={report.bestSellers} />
              </CardContent>
            </Card>
            <Card className="shadow-none lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Doanh thu theo danh mục</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryPieChart data={report.byCategory} />
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Warehouse className="h-4 w-4" /> So sánh kỳ
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Doanh thu", now: formatCurrency(report.current.revenue), before: formatCurrency(report.previous.revenue) },
              { label: "Đơn hàng", now: formatNumber(report.current.orders), before: formatNumber(report.previous.orders) },
              { label: "Sách đã bán", now: formatNumber(report.current.units), before: formatNumber(report.previous.units) },
            ].map((row) => (
              <div key={row.label} className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{row.label}</p>
                <p className="text-lg font-semibold tabular-nums">{row.now}</p>
                <p className="text-xs text-muted-foreground">Kỳ trước: {row.before}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </PageContainer>
    </AppShell>
  );
}
