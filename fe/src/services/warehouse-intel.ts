import type { Book, ExportReceipt, ImportReceipt, Order } from "@/types";

export interface IntelSnapshot {
  books: Book[];
  orders: Order[];
  imports: ImportReceipt[];
  exports: ExportReceipt[];
}

const DAY = 86_400_000;
const SOLD_STATUSES = new Set(["CONFIRMED", "PREPARING", "SHIPPING", "DELIVERED"]);

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

export const matches = (haystack: string, needle: string) =>
  norm(haystack).includes(norm(needle.trim()));

/** Units sold per book within the last N days */
export function soldUnits(orders: Order[], days: number, now = Date.now()) {
  const from = now - days * DAY;
  const map = new Map<string, number>();
  for (const o of orders) {
    if (!SOLD_STATUSES.has(o.status)) continue;
    if (new Date(o.createdAt).getTime() < from) continue;
    for (const it of o.items) map.set(it.bookId, (map.get(it.bookId) ?? 0) + it.quantity);
  }
  return map;
}

/** Last date each book was sold */
export function lastSold(orders: Order[]) {
  const map = new Map<string, number>();
  for (const o of orders) {
    if (!SOLD_STATUSES.has(o.status)) continue;
    const t = new Date(o.createdAt).getTime();
    for (const it of o.items) if (t > (map.get(it.bookId) ?? 0)) map.set(it.bookId, t);
  }
  return map;
}

export interface WarehouseInsight {
  level: "critical" | "warning" | "info";
  title: string;
  detail: string;
  action?: string;
}

export function analyzeWarehouse(snap: IntelSnapshot, now = Date.now()) {
  const { books, orders } = snap;
  const sold30 = soldUnits(orders, 30, now);
  const last = lastSold(orders);

  const outOfStock = books.filter((b) => b.stock === 0);
  const lowStock = books.filter((b) => b.stock > 0 && b.stock <= b.minStock);
  const overStock = [...books]
    .filter((b) => b.stock > b.minStock * 4)
    .sort((a, b) => b.stock * b.purchasePrice - a.stock * a.purchasePrice)
    .slice(0, 10);

  const fastMovers = [...books]
    .map((b) => ({ book: b, sold: sold30.get(b.id) ?? 0 }))
    .filter((x) => x.sold > 0)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 10);

  const slowMovers = [...books]
    .map((b) => ({ book: b, sold: sold30.get(b.id) ?? 0 }))
    .filter((x) => x.sold === 0 && x.book.stock > 0)
    .sort((a, b) => b.book.stock * b.book.purchasePrice - a.book.stock * a.book.purchasePrice)
    .slice(0, 10);

  const aging = books
    .filter((b) => b.stock > 0)
    .map((b) => {
      const ref = last.get(b.id) ?? new Date(b.createdAt).getTime();
      return { book: b, days: Math.max(0, Math.round((now - ref) / DAY)) };
    })
    .filter((x) => x.days >= 90)
    .sort((a, b) => b.days - a.days);

  const agingValue = aging.reduce((s, x) => s + x.book.stock * x.book.purchasePrice, 0);
  const inventoryValue = books.reduce((s, b) => s + b.stock * b.purchasePrice, 0);

  const insights: WarehouseInsight[] = [];
  if (outOfStock.length)
    insights.push({
      level: "critical",
      title: `${outOfStock.length} đầu sách đã hết hàng`,
      detail: outOfStock
        .slice(0, 5)
        .map((b) => b.title)
        .join(", "),
      action: "Tạo phiếu nhập bổ sung ngay để không mất đơn.",
    });
  if (lowStock.length)
    insights.push({
      level: "warning",
      title: `${lowStock.length} đầu sách sắp hết (dưới mức tồn tối thiểu)`,
      detail: lowStock
        .slice(0, 5)
        .map((b) => `${b.title} (${b.stock})`)
        .join(", "),
      action: "Ưu tiên nhập các đầu sách bán nhanh trong nhóm này.",
    });
  if (aging.length)
    insights.push({
      level: "warning",
      title: `${aging.length} đầu sách tồn kho trên 90 ngày`,
      detail: `Tổng giá trị tồn đọng khoảng ${Math.round(agingValue / 1_000_000)} triệu đồng.`,
      action: "Cân nhắc giảm giá, gộp combo hoặc ngừng nhập nhóm này.",
    });
  if (fastMovers.length)
    insights.push({
      level: "info",
      title: `Nhóm bán nhanh 30 ngày: ${fastMovers[0]!.book.title}`,
      detail: fastMovers
        .slice(0, 3)
        .map((x) => `${x.book.title} (${x.sold} cuốn)`)
        .join(", "),
      action: "Theo dõi tồn kho nhóm này để tránh đứt hàng.",
    });

  return {
    totals: {
      titles: books.length,
      stock: books.reduce((s, b) => s + b.stock, 0),
      inventoryValue,
      outOfStock: outOfStock.length,
      lowStock: lowStock.length,
      aging90: aging.length,
      agingValue,
      orders: orders.length,
    },
    outOfStock,
    lowStock,
    overStock,
    fastMovers,
    slowMovers,
    aging,
    insights,
  };
}

/** Human-readable report used by the AI report generator and the UI */
export function buildWarehouseReport(snap: IntelSnapshot, now = new Date()) {
  const a = analyzeWarehouse(snap, now.getTime());
  const from = now.getTime() - 30 * DAY;
  const imported = snap.imports
    .filter((i) => new Date(i.date).getTime() >= from)
    .reduce((s, i) => s + i.totalItems, 0);
  const exported = snap.exports
    .filter((e) => new Date(e.date).getTime() >= from)
    .reduce((s, e) => s + e.totalItems, 0);
  const revenue = snap.orders
    .filter((o) => SOLD_STATUSES.has(o.status) && new Date(o.createdAt).getTime() >= from)
    .reduce((s, o) => s + o.total, 0);
  return { ...a, period: { imported, exported, revenue } };
}
