import type { Book, Order } from "@/types";

export type RangeKey = "7d" | "30d" | "3m" | "6m" | "1y";

export const reportRanges: { value: RangeKey; label: string; days: number }[] = [
  { value: "7d", label: "7 ngày", days: 7 },
  { value: "30d", label: "30 ngày", days: 30 },
  { value: "3m", label: "3 tháng", days: 90 },
  { value: "6m", label: "6 tháng", days: 180 },
  { value: "1y", label: "1 năm", days: 365 },
];

export const rangeDays = (key: RangeKey) =>
  reportRanges.find((r) => r.value === key)?.days ?? 30;

const REVENUE_STATUSES = new Set(["CONFIRMED", "PREPARING", "SHIPPING", "DELIVERED"]);

export interface Totals {
  revenue: number;
  orders: number;
  units: number;
  avgOrderValue: number;
}

export interface ReportSeriesPoint {
  period: string;
  revenue: number;
  orders: number;
}

export interface Report {
  current: Totals;
  previous: Totals;
  series: ReportSeriesPoint[];
  bestSellers: { title: string; sold: number }[];
  byCategory: { category: string; value: number }[];
  inventoryValue: number;
}

const emptyTotals = (): Totals => ({ revenue: 0, orders: 0, units: 0, avgOrderValue: 0 });

const totalsOf = (orders: Order[]): Totals => {
  const billable = orders.filter((o) => REVENUE_STATUSES.has(o.status));
  const revenue = billable.reduce((s, o) => s + o.total, 0);
  const units = billable.reduce((s, o) => s + o.items.reduce((n, i) => n + i.quantity, 0), 0);
  return {
    revenue,
    orders: billable.length,
    units,
    avgOrderValue: billable.length ? Math.round(revenue / billable.length) : 0,
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
    days = Math.max(1, (end - from.getTime()) / msPerDay);
  }
  const start = end - days * msPerDay;
  const prevStart = start - days * msPerDay;

  const at = (o: Order) => new Date(o.createdAt).getTime();
  const currentOrders = orders.filter((o) => at(o) >= start && at(o) <= end);
  const previousOrders = orders.filter((o) => at(o) >= prevStart && at(o) < start);

  // Bucket into ~8 slices so every range renders a readable chart
  const buckets = Math.min(8, Math.max(4, Math.round(days / 7) || 4));
  const bucketMs = (days * msPerDay) / buckets;
  const series: ReportSeriesPoint[] = Array.from({ length: buckets }).map((_, i) => {
    const from = start + i * bucketMs;
    const to = from + bucketMs;
    const slice = currentOrders.filter((o) => at(o) >= from && at(o) < to && REVENUE_STATUSES.has(o.status));
    return {
      period: new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(new Date(from)),
      revenue: slice.reduce((s, o) => s + o.total, 0),
      orders: slice.length,
    };
  });

  const soldByBook = new Map<string, { title: string; sold: number }>();
  const categoryRevenue = new Map<string, number>();
  for (const order of currentOrders) {
    if (!REVENUE_STATUSES.has(order.status)) continue;
    for (const item of order.items) {
      const entry = soldByBook.get(item.bookId) ?? { title: item.title, sold: 0 };
      entry.sold += item.quantity;
      soldByBook.set(item.bookId, entry);
      const category = books.find((b) => b.id === item.bookId)?.category ?? "Khác";
      categoryRevenue.set(category, (categoryRevenue.get(category) ?? 0) + item.price * item.quantity);
    }
  }

  return {
    current: currentOrders.length ? totalsOf(currentOrders) : emptyTotals(),
    previous: previousOrders.length ? totalsOf(previousOrders) : emptyTotals(),
    series,
    bestSellers: [...soldByBook.values()].sort((a, b) => b.sold - a.sold).slice(0, 5),
    byCategory: [...categoryRevenue.entries()]
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value),
    inventoryValue: books.reduce((s, b) => s + b.stock * b.purchasePrice, 0),
  };
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
