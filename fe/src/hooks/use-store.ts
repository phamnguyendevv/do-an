import { useSyncExternalStore } from "react";
import { store, type AppState } from "@/services/store";
import { selectInventorySummary, selectStockMovements } from "@/services/report-service";
import type {
  Book,
  Customer,
  ExportReceipt,
  ImportReceipt,
  Order,
  Shipping,
  StockMovement,
} from "@/types";

function useAppState(): AppState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

export function useBooks(): Book[] {
  return useAppState().books;
}

export function useCategories(): Array<{ id: string; name: string }> {
  const { categories, books } = useAppState();
  if (categories.length) return categories.map(({ id, name }) => ({ id, name }));
  return Array.from(new Set(books.map((book) => book.category.trim()).filter(Boolean))).map(
    (name) => ({ id: name, name }),
  );
}

export function useOrders(): Order[] {
  return useAppState().orders;
}

export function useCustomers(): Customer[] {
  return useAppState().customers;
}

export function useImportReceipts(): ImportReceipt[] {
  return useAppState().imports;
}

export function useExportReceipts(): ExportReceipt[] {
  return useAppState().exports;
}

export function useShipments(): Shipping[] {
  return useAppState().shipments;
}

export function useStockMovements(): StockMovement[] {
  const state = useAppState();
  return selectStockMovements(state);
}

export function useInventorySummary() {
  return selectInventorySummary(useAppState());
}
