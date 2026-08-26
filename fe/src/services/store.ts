import type { Book, ExportReceipt, ImportReceipt, Order, Shipping } from "@/types";
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

const initialState: AppState = {
  books: [],
  orders: mockOrders,
  imports: mockImportReceipts,
  exports: mockExportReceipts,
  shipments: mockShipments,
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
