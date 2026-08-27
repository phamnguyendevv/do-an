import type { Book, ExportReceipt, ImportReceipt, Order, Shipping } from "@/types";
import { mockBooks } from "@/mock/books";
import { mockOrders } from "@/mock/orders";
import { mockExportReceipts, mockImportReceipts } from "@/mock/inventory";
import { mockShipments } from "@/mock/shipping";

export interface AppState {
  books: Book[];
  orders: Order[];
  imports: ImportReceipt[];
  exports: ExportReceipt[];
  shipments: Shipping[];
}

const STORAGE_KEY = "bookstock_app_state_v2";

function loadSavedState(): Partial<AppState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error("Lỗi đọc state từ localStorage:", e);
    return {};
  }
}

function saveState(s: AppState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        orders: s.orders,
        imports: s.imports,
        exports: s.exports,
        // shipments are auto-generated from orders via useShipments hook, no need to persist
      })
    );
  } catch (e) {
    console.error("Lỗi lưu state vào localStorage:", e);
  }
}

const saved = loadSavedState();

const initialState: AppState = {
  books: mockBooks,
  orders: saved.orders ?? [],
  imports: saved.imports ?? [],
  exports: saved.exports ?? [],
  shipments: [], // auto-generated from DB orders via useShipments hook
};

let state: AppState = initialState;
const listeners = new Set<() => void>();

export const store = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => state,
  getServerSnapshot: () => initialState,
  setState(patch: Partial<AppState>) {
    state = { ...state, ...patch };
    saveState(state);
    listeners.forEach((l) => l());
  },
};

export const bookStatusOf = (stock: number, minStock: number): Book["status"] =>
  stock === 0 ? "OUT_OF_STOCK" : stock <= minStock ? "LOW_STOCK" : "IN_STOCK";

/** Apply signed stock deltas (positive = import, negative = export) */
export function applyStockDeltas(deltas: Record<string, number>) {
  const books = store.getSnapshot().books.map((b) => {
    const delta = deltas[b.id];
    if (!delta) return b;
    const stock = Math.max(0, b.stock + delta);
    return { ...b, stock, status: bookStatusOf(stock, b.minStock) };
  });
  store.setState({ books });
}

export const nextId = (prefix: string, existing: { id: string }[], base: number) =>
  `${prefix}-${base + existing.length + 1}`;
