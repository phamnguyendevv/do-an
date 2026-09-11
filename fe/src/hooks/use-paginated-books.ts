import { useQuery } from "@tanstack/react-query";
import { bookApi, type BookApiItem } from "@/lib/book-api";
import type { Book } from "@/types";

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

export const mapApiBook = (book: BookApiItem): Book => {
  const stock = Number(book?.stock ?? 0);
  const minStock = Number(book?.minStock ?? 0);
  const purchasePrice = Number(
    book?.purchasePrice ?? (book as BookApiItem & { importPrice?: number })?.importPrice ?? 0,
  );
  const sellingPrice = Number(
    book?.sellingPrice ?? (book as BookApiItem & { price?: number })?.price ?? 0,
  );
  const rawStatus =
    (book?.status as string | undefined) ||
    (stock === 0 ? "OUT_OF_STOCK" : stock <= minStock ? "LOW_STOCK" : "IN_STOCK");

  return {
    id: String(book?.id ?? ""),
    title: String(book?.title ?? ""),
    author: String(book?.author ?? ""),
    category: String(book?.category ?? ""),
    purchasePrice,
    sellingPrice,
    price: sellingPrice,
    importPrice: purchasePrice,
    stock,
    minStock,
    status: rawStatus,
    createdAt:
      typeof book?.createdAt === "string"
        ? book.createdAt
        : new Date(book?.createdAt ?? Date.now()).toISOString(),
  };
};

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
    sortOrder,
  } = params;

  const query = useQuery({
    queryKey: [
      "books",
      "paginated",
      {
        page,
        size,
        search,
        category,
        status,
        minPrice,
        maxPrice,
        startDate,
        endDate,
        sortBy,
        sortOrder,
      },
    ],
    queryFn: async () => {
      // Build params without undefined values to satisfy exactOptionalPropertyTypes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p: any = { page, size };
      if (search?.trim()) p["search"] = search.trim();
      if (category && category !== "all") p["category"] = category;
      if (status && status !== "all") p["status"] = status;
      if (minPrice !== undefined) p["minPrice"] = minPrice;
      if (maxPrice !== undefined) p["maxPrice"] = maxPrice;
      if (startDate) p["startDate"] = startDate;
      if (endDate) p["endDate"] = endDate;
      if (sortBy) p["sortBy"] = sortBy;
      if (sortOrder) p["sortOrder"] = sortOrder;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await bookApi.list(p);

      let items: BookApiItem[] = [];
      let total = 0;

      if (Array.isArray(res?.data)) {
        items = res.data;
        total = res.pagination?.total ?? res.data.length;
      } else if (Array.isArray(res)) {
        items = res;
        total = res.length;
      }

      return {
        items: items.map(mapApiBook),
        pagination: {
          total,
          page: res?.pagination?.page ?? page,
          size: res?.pagination?.size ?? size,
        },
      };
    },
    placeholderData: (prev) => prev,
    staleTime: 15_000,
  });

  return {
    books: query.data?.items ?? [],
    pagination: query.data?.pagination ?? { total: 0, page, size },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
