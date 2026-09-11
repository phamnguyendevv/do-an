import type { Book, ExportReceipt, ImportReceipt, Order } from "@/types";

export type RangeKey = "7d" | "30d" | "3m" | "6m" | "1y";

export const reportRanges: { value: RangeKey; label: string; days: number }[] = [
  { value: "7d", label: "7 ngày qua", days: 7 },
  { value: "30d", label: "30 ngày qua", days: 30 },
  { value: "3m", label: "3 tháng qua", days: 90 },
  { value: "6m", label: "6 tháng qua", days: 180 },
  { value: "1y", label: "1 năm qua", days: 365 },
];

export const rangeDays = (key: RangeKey) => reportRanges.find((r) => r.value === key)?.days ?? 30;

const REVENUE_STATUSES = new Set(["CONFIRMED", "PREPARING", "SHIPPING", "DELIVERED"]);

export interface Totals {
  revenue: number;
  cogs: number;
  grossProfit: number;
  margin: number;
  orders: number;
  units: number;
  avgOrderValue: number;
  deliveredOrders: number;
  paidRevenue: number;
  pendingRevenue: number;
}

export interface ReportSeriesPoint {
  period: string;
  revenue: number;
  orders: number;
  cogs: number;
  profit: number;
}

export interface StockMovementPoint {
  month: string;
  nhap: number;
  xuat: number;
}

export interface Report {
  current: Totals;
  previous: Totals;
  series: ReportSeriesPoint[];
  stockMovement: StockMovementPoint[];
  bestSellers: { title: string; sold: number; revenue: number }[];
  byCategory: { category: string; value: number; count: number }[];
  byStatus: { status: string; label: string; count: number; value: number }[];
  inventoryValue: number;
}

const emptyTotals = (): Totals => ({
  revenue: 0,
  cogs: 0,
  grossProfit: 0,
  margin: 0,
  orders: 0,
  units: 0,
  avgOrderValue: 0,
  deliveredOrders: 0,
  paidRevenue: 0,
  pendingRevenue: 0,
});

const totalsOf = (orders: Order[], books: Book[]): Totals => {
  const bookMap = new Map(books.map((b) => [String(b.id), b]));
  const billable = orders.filter((o) => REVENUE_STATUSES.has(o.status));
  const revenue = billable.reduce((s, o) => s + (o.total || 0), 0);
  const units = billable.reduce(
    (s, o) => s + (o.items || []).reduce((n, i) => n + (i.quantity || 0), 0),
    0,
  );

  const cogs = billable.reduce((acc, o) => {
    const oCost = (o.items || []).reduce((subAcc, it) => {
      const bk =
        bookMap.get(String(it.bookId)) ||
        books.find((b) => b.title.trim().toLowerCase() === it.title.trim().toLowerCase());
      const unitCost = bk?.purchasePrice || bk?.importPrice || (it.price || 0) * 0.7;
      return subAcc + unitCost * (it.quantity || 0);
    }, 0);
    return acc + oCost;
  }, 0);

  const grossProfit = Math.max(0, revenue - cogs);
  const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const deliveredOrders = orders.filter((o) => o.status === "DELIVERED").length;
  const paidOrders = billable.filter((o) => o.payment === "PAID" || o.status === "DELIVERED");
  const paidRevenue = paidOrders.reduce((s, o) => s + (o.total || 0), 0);
  const pendingRevenue = Math.max(0, revenue - paidRevenue);

  return {
    revenue,
    cogs,
    grossProfit,
    margin,
    orders: billable.length,
    units,
    avgOrderValue: billable.length ? Math.round(revenue / billable.length) : 0,
    deliveredOrders,
    paidRevenue,
    pendingRevenue,
  };
};

/** Percentage change vs the previous period; null when there is no baseline. */
export const growth = (current: number, previous: number): number | null =>
  previous === 0 ? null : ((current - previous) / previous) * 100;

export const growthHint = (current: number, previous: number) => {
  const g = growth(current, previous);
  if (g === null) return { hint: "Không có dữ liệu kỳ trước", trend: "neutral" as const };
  const sign = g >= 0 ? "+" : "";
  return {
    hint: `${sign}${g.toFixed(1)}% so với kỳ trước`,
    trend: (g >= 0 ? "up" : "down") as "up" | "down",
  };
};

export function buildReport(
  orders: Order[],
  books: Book[],
  range: RangeKey,
  now: Date = new Date(),
  custom?: { from: Date; to?: Date },
  imports: ImportReceipt[] = [],
  exports: ExportReceipt[] = [],
): Report {
  const msPerDay = 86_400_000;
  let end = now.getTime();
  let days = rangeDays(range);

  if (custom?.from) {
    const from = new Date(custom.from);
    from.setHours(0, 0, 0, 0);
    const to = new Date(custom.to ?? custom.from);
    to.setHours(23, 59, 59, 999);
    end = to.getTime();
    days = Math.max(1, Math.round((end - from.getTime()) / msPerDay));
  }
  const start = end - days * msPerDay;
  const prevStart = start - days * msPerDay;

  const at = (o: Order) => new Date(o.createdAt).getTime();
  const currentOrders = orders.filter((o) => at(o) >= start && at(o) <= end);
  const previousOrders = orders.filter((o) => at(o) >= prevStart && at(o) < start);

  const bookMap = new Map(books.map((b) => [String(b.id), b]));

  // Slices / Buckets for charts
  const buckets = Math.min(8, Math.max(4, Math.round(days / 7) || 4));
  const bucketMs = (days * msPerDay) / buckets;

  const series: ReportSeriesPoint[] = Array.from({ length: buckets }).map((_, i) => {
    const from = start + i * bucketMs;
    const to = from + bucketMs;
    const slice = currentOrders.filter(
      (o) => at(o) >= from && at(o) < to && REVENUE_STATUSES.has(o.status),
    );

    const sliceRevenue = slice.reduce((s, o) => s + (o.total || 0), 0);
    const sliceCogs = slice.reduce((acc, o) => {
      const oCost = (o.items || []).reduce((subAcc, it) => {
        const bk =
          bookMap.get(String(it.bookId)) ||
          books.find((b) => b.title.trim().toLowerCase() === it.title.trim().toLowerCase());
        const unitCost = bk?.purchasePrice || bk?.importPrice || (it.price || 0) * 0.7;
        return subAcc + unitCost * (it.quantity || 0);
      }, 0);
      return acc + oCost;
    }, 0);

    return {
      period: new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      }).format(new Date(from)),
      revenue: sliceRevenue,
      cogs: sliceCogs,
      profit: Math.max(0, sliceRevenue - sliceCogs),
      orders: slice.length,
    };
  });

  // Best sellers in current range
  const soldByBook = new Map<string, { title: string; sold: number; revenue: number }>();
  const categoryMap = new Map<string, { value: number; count: number }>();

  for (const order of currentOrders) {
    if (!REVENUE_STATUSES.has(order.status)) continue;
    for (const item of order.items || []) {
      const key = String(item.bookId || item.title);
      const entry = soldByBook.get(key) ?? { title: item.title, sold: 0, revenue: 0 };
      entry.sold += Number(item.quantity || 0);
      entry.revenue += Number(item.quantity || 0) * Number(item.price || 0);
      soldByBook.set(key, entry);

      const bk =
        bookMap.get(String(item.bookId)) ||
        books.find((b) => b.title.trim().toLowerCase() === item.title.trim().toLowerCase());
      const categoryName = bk?.category?.trim() || "Khác";

      const catEntry = categoryMap.get(categoryName) ?? { value: 0, count: 0 };
      catEntry.value += Number(item.quantity || 0) * Number(item.price || 0);
      catEntry.count += Number(item.quantity || 0);
      categoryMap.set(categoryName, catEntry);
    }
  }

  // Dynamic stock movement for the buckets
  const stockMovement: StockMovementPoint[] = Array.from({ length: buckets }).map((_, i) => {
    const from = start + i * bucketMs;
    const to = from + bucketMs;

    const matchingImports = imports.filter((imp) => {
      const t = new Date(imp.date).getTime();
      return t >= from && t < to;
    });
    const nhap = matchingImports.reduce((s, it) => s + (it.totalItems || 0), 0);

    const matchingExports = exports.filter((exp) => {
      const t = new Date(exp.date).getTime();
      return t >= from && t < to;
    });
    const exportCount = matchingExports.reduce((s, it) => s + (it.totalItems || 0), 0);

    const sliceOrders = currentOrders.filter(
      (o) => at(o) >= from && at(o) < to && o.status !== "CANCELLED",
    );
    const orderItems = sliceOrders.reduce(
      (s, o) => s + (o.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0),
      0,
    );

    return {
      month: new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      }).format(new Date(from)),
      nhap,
      xuat: exportCount + orderItems,
    };
  });

  // Order status breakdown in current period
  const statusLabels: Record<string, string> = {
    PENDING: "Chờ xử lý",
    CONFIRMED: "Đã duyệt",
    PREPARING: "Đang đóng gói",
    SHIPPING: "Đang giao",
    DELIVERED: "Giao thành công",
    CANCELLED: "Đã hủy",
    RETURNED: "Hoàn hàng",
  };

  const statusMap = new Map<string, { count: number; value: number }>();
  for (const order of currentOrders) {
    const s = order.status || "PENDING";
    const entry = statusMap.get(s) ?? { count: 0, value: 0 };
    entry.count += 1;
    entry.value += Number(order.total || 0);
    statusMap.set(s, entry);
  }

  const byStatus = Array.from(statusMap.entries()).map(([status, val]) => ({
    status,
    label: statusLabels[status] || status,
    count: val.count,
    value: val.value,
  }));

  return {
    current: currentOrders.length ? totalsOf(currentOrders, books) : emptyTotals(),
    previous: previousOrders.length ? totalsOf(previousOrders, books) : emptyTotals(),
    series,
    stockMovement,
    bestSellers: [...soldByBook.values()].sort((a, b) => b.sold - a.sold).slice(0, 5),
    byCategory: [...categoryMap.entries()]
      .map(([category, data]) => ({ category, value: data.value, count: data.count }))
      .sort((a, b) => b.value - a.value),
    byStatus,
    inventoryValue: books.reduce(
      (s, b) => s + (b.stock || 0) * (b.purchasePrice || b.price || 0),
      0,
    ),
  };
}

/** Export rich multi-section analytics report to CSV */
export function exportFullAnalyticsReport(filename: string, report: Report, rangeLabel: string) {
  const lines: string[] = [];

  lines.push(`BÁO CÁO PHÂN TÍCH KINH DOANH - BOOKSTOCK (${rangeLabel})`);
  lines.push(`Ngày xuất báo cáo: ${new Date().toLocaleString("vi-VN")}`);
  lines.push("");

  // 1. Tổng quan tài chính
  lines.push("1. TỔNG QUAN KINH DOANH");
  lines.push("Chỉ số,Kỳ này,Kỳ trước,Tăng trưởng");
  const revGrowth = growth(report.current.revenue, report.previous.revenue);
  const profitGrowth = growth(report.current.grossProfit, report.previous.grossProfit);
  const orderGrowth = growth(report.current.orders, report.previous.orders);
  const unitGrowth = growth(report.current.units, report.previous.units);

  lines.push(
    `Doanh thu (VNĐ),${report.current.revenue},${report.previous.revenue},${revGrowth !== null ? `${revGrowth.toFixed(1)}%` : "N/A"}`,
  );
  lines.push(`Giá vốn hàng bán (VNĐ),${report.current.cogs},${report.previous.cogs},N/A`);
  lines.push(
    `Lợi nhuận gộp (VNĐ),${report.current.grossProfit},${report.previous.grossProfit},${profitGrowth !== null ? `${profitGrowth.toFixed(1)}%` : "N/A"}`,
  );
  lines.push(
    `Biên lợi nhuận,${report.current.margin.toFixed(1)}%,${report.previous.margin.toFixed(1)}%,N/A`,
  );
  lines.push(
    `Số đơn hàng,${report.current.orders},${report.previous.orders},${orderGrowth !== null ? `${orderGrowth.toFixed(1)}%` : "N/A"}`,
  );
  lines.push(
    `Sách đã bán (cuốn),${report.current.units},${report.previous.units},${unitGrowth !== null ? `${unitGrowth.toFixed(1)}%` : "N/A"}`,
  );
  lines.push(
    `Giá trị đơn TB (VNĐ),${report.current.avgOrderValue},${report.previous.avgOrderValue},N/A`,
  );
  lines.push(`Doanh thu đã thu (VNĐ),${report.current.paidRevenue},N/A,N/A`);
  lines.push(`Doanh thu chờ thu (VNĐ),${report.current.pendingRevenue},N/A,N/A`);
  lines.push(`Trị giá vốn tồn kho (VNĐ),${report.inventoryValue},N/A,N/A`);
  lines.push("");

  // 2. Diễn biến theo kỳ
  lines.push("2. DIỄN BIẾN DOANH THU & LỢI NHUẬN THEO MỐC THỜI GIAN");
  lines.push("Kỳ,Doanh thu (VNĐ),Giá vốn (VNĐ),Lợi nhuận (VNĐ),Số đơn");
  for (const s of report.series) {
    lines.push(`"${s.period}",${s.revenue},${s.cogs},${s.profit},${s.orders}`);
  }
  lines.push("");

  // 3. Top sách bán chạy
  lines.push("3. TOP SÁCH BÁN CHẠY NHẤT");
  lines.push("Tên sách,Số lượng đã bán (cuốn),Doanh thu ước tính (VNĐ)");
  for (const b of report.bestSellers) {
    lines.push(`"${b.title.replace(/"/g, '""')}",${b.sold},${b.revenue}`);
  }
  lines.push("");

  // 4. Cơ cấu theo danh mục
  lines.push("4. CƠ CẤU DOANH THU THEO DANH MỤC");
  lines.push("Danh mục,Doanh thu (VNĐ),Số lượng bán (cuốn)");
  for (const c of report.byCategory) {
    lines.push(`"${c.category.replace(/"/g, '""')}",${c.value},${c.count}`);
  }

  const csvContent = "\uFEFF" + lines.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Books at or below their minimum level, most urgent first. */
export function reorderSuggestions(books: Book[]) {
  return books
    .filter((b) => b.status === "LOW_STOCK" || b.status === "OUT_OF_STOCK")
    .map((b) => ({
      ...b,
      suggestedQuantity: Math.max(b.minStock * 2 - b.stock, b.minStock),
    }))
    .sort((a, b) => a.stock - b.stock);
}
