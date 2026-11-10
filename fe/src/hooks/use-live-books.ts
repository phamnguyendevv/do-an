import { useQuery } from "@tanstack/react-query";

import { bookApi, mapBookApiItem } from "@/lib/book-api";

export function useLiveBooks(enabled = true) {
  return useQuery({
    queryKey: ["books", "live-list"],
    queryFn: async () => {
      const firstPage = await bookApi.list({ page: 1, size: 100 });
      const pageSize = Math.max(1, firstPage.pagination.size);
      const pageCount = Math.ceil(firstPage.pagination.total / pageSize);
      const remainingPages = await Promise.all(
        Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
          bookApi.list({ page: index + 2, size: pageSize }),
        ),
      );
      return [firstPage, ...remainingPages].flatMap((page) => page.data.map(mapBookApiItem));
    },
    enabled,
    refetchInterval: 15_000,
  });
}
