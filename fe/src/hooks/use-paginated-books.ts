import { useMemo, useSyncExternalStore } from "react";
import type { Book } from "@/types";
import { store } from "@/services/store";

export interface UsePaginatedBooksParams {
  page?: number;
  size?: number;
  search?: string;
  category?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export function usePaginatedBooks(params: UsePaginatedBooksParams = {}) {
  const {
    page = 1,
    size = 10,
    search,
    category,
    status,
    minPrice,
    maxPrice,
    startDate,
    endDate,
    sortBy,
    sortOrder = "ASC",
  } = params;
  const books = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot).books;

  const result = useMemo(() => {
    const query = search?.trim().toLocaleLowerCase();
    const from = startDate ? Date.parse(startDate) : undefined;
    const to = endDate ? Date.parse(endDate) + 24 * 60 * 60 * 1000 : undefined;
    const filtered = books.filter((book) => {
      const sellingPrice = book.sellingPrice ?? book.price ?? 0;
      const created = Date.parse(book.createdAt);
      return (
        (!query ||
          book.title.toLocaleLowerCase().includes(query) ||
          book.author.toLocaleLowerCase().includes(query)) &&
        (!category || category === "all" || book.category === category) &&
        (!status || status === "all" || book.status === status) &&
        (minPrice === undefined || sellingPrice >= minPrice) &&
        (maxPrice === undefined || sellingPrice <= maxPrice) &&
        (from === undefined || created >= from) &&
        (to === undefined || created < to)
      );
    });

    if (sortBy) {
      const direction = sortOrder === "DESC" ? -1 : 1;
      filtered.sort((left, right) => {
        const leftValue = left[sortBy as keyof Book];
        const rightValue = right[sortBy as keyof Book];
        if (typeof leftValue === "number" && typeof rightValue === "number") {
          return (leftValue - rightValue) * direction;
        }
        return String(leftValue ?? "").localeCompare(String(rightValue ?? "")) * direction;
      });
    }

    const safePage = Math.max(1, Math.floor(page));
    const safeSize = Math.max(1, Math.floor(size));
    return {
      items: filtered.slice((safePage - 1) * safeSize, safePage * safeSize),
      pagination: { total: filtered.length, page: safePage, size: safeSize },
    };
  }, [
    books,
    category,
    endDate,
    maxPrice,
    minPrice,
    page,
    search,
    size,
    sortBy,
    sortOrder,
    startDate,
    status,
  ]);

  return {
    books: result.items,
    pagination: result.pagination,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: () => Promise.resolve({ data: result }),
  };
}
