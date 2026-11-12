import { useQuery } from "@tanstack/react-query";
import { bookApi, mapBookApiItem } from "@/lib/book-api";

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
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.max(1, Math.floor(size));
  const query = useQuery({
    queryKey: [
      "books",
      "page",
      safePage,
      safeSize,
      search,
      category,
      status,
      minPrice,
      maxPrice,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    ],
    queryFn: async () => {
      const response = await bookApi.list({
        page: safePage,
        size: safeSize,
        ...(search ? { search } : {}),
        ...(category && category !== "all" ? { category } : {}),
        ...(status && status !== "all" ? { status } : {}),
        ...(minPrice !== undefined ? { minPrice } : {}),
        ...(maxPrice !== undefined ? { maxPrice } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(sortBy ? { sortBy } : {}),
        ...(sortBy ? { sortOrder } : {}),
      });
      return {
        books: response.data.map(mapBookApiItem),
        pagination: response.pagination,
      };
    },
  });

  return {
    books: query.data?.books ?? [],
    pagination: query.data?.pagination ?? { total: 0, page: safePage, size: safeSize },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Không thể tải danh sách sách."
          : null,
    refetch: query.refetch,
  };
}
