import type { Book, Order } from "@/types";
import { store } from "./store";
import {
  analyzeWarehouse,
  buildWarehouseReport,
  matches,
  soldUnits,
  type IntelSnapshot,
} from "./warehouse-intel";

export interface ActionLine {
  bookId: string;
  title: string;
  quantity: number;
  price: number;
  stock: number;
}

export type PendingAction =
  | {
      kind: "create_order";
      customerName: string;
      customerPhone: string;
      customerAddress: string;
      lines: ActionLine[];
      total: number;
      warnings: string[];
    }
  | {
      kind: "import";
      supplier: string;
      note: string;
      lines: ActionLine[];
      total: number;
      warnings: string[];
    }
  | { kind: "export"; reason: string; orderId: string; lines: ActionLine[]; warnings: string[] }
  | { kind: "navigate"; path: string; label: string };

export interface ToolOutcome {
  result: unknown;
  action?: PendingAction;
}

const snapshot = (): IntelSnapshot => {
  const s = store.getSnapshot();
  return { books: s.books, orders: s.orders, imports: s.imports, exports: s.exports };
};

const bookBrief = (b: Book) => ({
  id: b.id,
  title: b.title,
  author: b.author,
  category: b.category,
  price: b.sellingPrice,
  stock: b.stock,
  minStock: b.minStock,
  status: b.status,
});

const orderBrief = (o: Order) => ({
  id: o.id,
  customer: o.customerName,
  phone: o.customerPhone,
  status: o.status,
  payment: o.payment,
  total: o.total,
  createdAt: o.createdAt,
  items: o.items.map((i) => `${i.title} x${i.quantity}`),
});

const findBook = (books: Book[], title: string) =>
  books.find((b) => matches(b.title, title)) ??
  books.find((b) => title.split(/\s+/).every((w) => matches(b.title, w)));

function toLines(
  items: { title: string; quantity: number }[],
  priceOf: (b: Book) => number,
  checkStock: boolean,
) {
  const books = store.getSnapshot().books;
  const lines: ActionLine[] = [];
  const warnings: string[] = [];
  for (const it of items) {
    const book = findBook(books, it.title);
    if (!book) {
      warnings.push(`Không tìm thấy sách "${it.title}" trong hệ thống.`);
      continue;
    }
    const quantity = Math.max(1, Math.round(it.quantity || 1));
    if (checkStock && quantity > book.stock)
      warnings.push(`"${book.title}" chỉ còn ${book.stock} cuốn (yêu cầu ${quantity}).`);
    lines.push({
      bookId: book.id,
      title: book.title,
      quantity,
      price: priceOf(book),
      stock: book.stock,
    });
  }
  return { lines, warnings };
}

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export function executeTool(name: string, rawArgs: string): ToolOutcome {
  let args: Record<string, any> = {};
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    args = {};
  }
  const snap = snapshot();

  switch (name) {
    case "analyze_warehouse": {
      const a = analyzeWarehouse(snap);
      return {
        result: {
          totals: a.totals,
          outOfStock: a.outOfStock.slice(0, 10).map(bookBrief),
          lowStock: a.lowStock.slice(0, 10).map(bookBrief),
          overStock: a.overStock.map(bookBrief),
          fastMovers: a.fastMovers.map((x) => ({ ...bookBrief(x.book), sold30d: x.sold })),
          slowMovers: a.slowMovers.map((x) => ({ ...bookBrief(x.book), sold30d: 0 })),
          aging90: a.aging.slice(0, 15).map((x) => ({ ...bookBrief(x.book), daysIdle: x.days })),
          insights: a.insights,
        },
      };
    }

    case "search_books": {
      const sold = soldUnits(snap.orders, 30);
      let list = snap.books.filter((b) => {
        if (args["query"] && !(matches(b.title, args["query"]) || matches(b.author, args["query"])))
          return false;
        if (args["category"] && !matches(b.category, args["category"])) return false;
        if (args["maxPrice"] != null && b.sellingPrice > args["maxPrice"]) return false;
        if (args["minPrice"] != null && b.sellingPrice < args["minPrice"]) return false;
        if (args["maxStock"] != null && b.stock > args["maxStock"]) return false;
        if (args["minStock"] != null && b.stock < args["minStock"]) return false;
        if (args["status"] && b.status !== args["status"]) return false;
        return true;
      });
      const sort = args["sort"];
      if (sort === "stock_asc") list = [...list].sort((a, b) => a.stock - b.stock);
      if (sort === "stock_desc") list = [...list].sort((a, b) => b.stock - a.stock);
      if (sort === "price_asc") list = [...list].sort((a, b) => a.sellingPrice - b.sellingPrice);
      if (sort === "price_desc") list = [...list].sort((a, b) => b.sellingPrice - a.sellingPrice);
      if (sort === "best_selling")
        list = [...list].sort((a, b) => (sold.get(b.id) ?? 0) - (sold.get(a.id) ?? 0));
      const limit = Math.min(args["limit"] ?? 15, 30);
      return {
        result: {
          count: list.length,
          books: list
            .slice(0, limit)
            .map((b) => ({ ...bookBrief(b), sold30d: sold.get(b.id) ?? 0 })),
        },
      };
    }

    case "search_orders": {
      const period = args["period"] ?? "all";
      const from =
        period === "today"
          ? startOfToday()
          : period === "7d"
            ? Date.now() - 7 * 86_400_000
            : period === "30d"
              ? Date.now() - 30 * 86_400_000
              : 0;
      const list = snap.orders.filter((o) => {
        if (args["status"] && o.status !== args["status"]) return false;
        if (args["payment"] && o.payment !== args["payment"]) return false;
        if (new Date(o.createdAt).getTime() < from) return false;
        if (
          args["query"] &&
          !(
            matches(o.customerName, args["query"]) ||
            matches(o.id, args["query"]) ||
            o.customerPhone.includes(args["query"])
          )
        )
          return false;
        return true;
      });
      const limit = Math.min(args["limit"] ?? 15, 30);
      return {
        result: {
          count: list.length,
          totalValue: list.reduce((s, o) => s + o.total, 0),
          orders: list.slice(0, limit).map(orderBrief),
        },
      };
    }

    case "check_stock": {
      const book = findBook(snap.books, String(args["title"] ?? ""));
      if (!book) return { result: { found: false, message: "Không tìm thấy sách phù hợp." } };
      const days = args["days"] ?? 30;
      const sold = soldUnits(snap.orders, days).get(book.id) ?? 0;
      return { result: { found: true, ...bookBrief(book), soldUnits: sold, days } };
    }

    case "generate_report": {
      const r = buildWarehouseReport(snap);
      return {
        result: {
          type: args["type"],
          generatedAt: new Date().toISOString(),
          totals: r.totals,
          period: r.period,
          insights: r.insights,
          topAging: r.aging
            .slice(0, 10)
            .map((x) => ({ title: x.book.title, days: x.days, stock: x.book.stock })),
          fastMovers: r.fastMovers.map((x) => ({ title: x.book.title, sold30d: x.sold })),
          lowStock: r.lowStock
            .slice(0, 10)
            .map((b) => ({ title: b.title, stock: b.stock, minStock: b.minStock })),
        },
      };
    }

    case "prepare_create_order": {
      const { lines, warnings } = toLines(args["items"] ?? [], (b) => b.sellingPrice, true);
      const action: PendingAction = {
        kind: "create_order",
        customerName: String(args["customerName"] ?? ""),
        customerPhone: String(args["customerPhone"] ?? ""),
        customerAddress: String(args["customerAddress"] ?? ""),
        lines,
        total: lines.reduce((s, l) => s + l.price * l.quantity, 0),
        warnings,
      };
      return {
        action,
        result: {
          prepared: true,
          requiresConfirmation: true,
          lines,
          warnings,
          total: action.total,
        },
      };
    }

    case "prepare_import": {
      const { lines, warnings } = toLines(args["items"] ?? [], (b) => b.purchasePrice, false);
      const action: PendingAction = {
        kind: "import",
        supplier: String(args["supplier"] ?? ""),
        note: String(args["note"] ?? ""),
        lines,
        total: lines.reduce((s, l) => s + l.price * l.quantity, 0),
        warnings,
      };
      return { action, result: { prepared: true, requiresConfirmation: true, lines, warnings } };
    }

    case "prepare_export": {
      const { lines, warnings } = toLines(args["items"] ?? [], (b) => b.sellingPrice, true);
      const action: PendingAction = {
        kind: "export",
        reason: String(args["reason"] ?? "Xuất kho theo yêu cầu"),
        orderId: String(args["orderId"] ?? ""),
        lines,
        warnings,
      };
      return { action, result: { prepared: true, requiresConfirmation: true, lines, warnings } };
    }

    case "navigate":
      return {
        action: {
          kind: "navigate",
          path: String(args["path"] ?? "/dashboard"),
          label: String(args["label"] ?? "Mở trang"),
        },
        result: { suggested: args["path"] },
      };

    default:
      return { result: { error: `Unknown tool ${name}` } };
  }
}
