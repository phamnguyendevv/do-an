import { useEffect, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { store, type AppState } from "@/services/store";
import { bookApi, type BookApiItem } from "@/lib/book-api";
import type { Book } from "@/types";

const mapApiBook = (book: BookApiItem): Book => {
  const stock = Number(book?.stock ?? 0);
  const minStock = Number(book?.minStock ?? 0);
  const rawStatus = (book?.status as any) || (stock === 0 ? "OUT_OF_STOCK" : stock <= minStock ? "LOW_STOCK" : "IN_STOCK");

  return {
    id: String(book?.id ?? ""),
    title: String(book?.title ?? ""),
    author: String(book?.author ?? ""),
    category: String(book?.category ?? ""),
    purchasePrice: Number(book?.purchasePrice ?? 0),
    sellingPrice: Number(book?.sellingPrice ?? 0),
    stock,
    minStock,
    status: rawStatus,
    createdAt: typeof book?.createdAt === "string" ? book.createdAt : new Date(book?.createdAt ?? Date.now()).toISOString(),
  };
};

function useAppState(): AppState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

export function useBooks(): Book[] {
  const stateBooks = useAppState().books;

  const { data: apiBooks } = useQuery({
    queryKey: ["books", "live-list"],
    queryFn: async () => {
      try {
        const res = await bookApi.list({ size: 500 });
        const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        return (items as BookApiItem[]).map(mapApiBook);
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (apiBooks && apiBooks.length > 0) {
      store.setState({ books: apiBooks });
    }
  }, [apiBooks]);

  if (apiBooks && apiBooks.length > 0) {
    return apiBooks;
  }

  return stateBooks;
}

export const useOrders = () => useAppState().orders;
export const useImportReceipts = () => useAppState().imports;
export const useExportReceipts = () => useAppState().exports;
export const useShipments = () => useAppState().shipments;

export function useInventorySummary() {
  const books = useBooks();
  return {
    totalStock: books.reduce((s, b) => s + (b.stock || 0), 0),
    lowStock: books.filter((b) => b.status === "LOW_STOCK").length,
    outOfStock: books.filter((b) => b.status === "OUT_OF_STOCK").length,
    inventoryValue: books.reduce((s, b) => s + (b.stock || 0) * (b.purchasePrice || 0), 0),
  };
}
