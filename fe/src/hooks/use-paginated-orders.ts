import { useQuery } from "@tanstack/react-query";
import { orderApi, mapOrderApiItem } from "@/lib/order-api";

export interface UsePaginatedOrdersParams {
  page?: number;
  size?: number;
  search?: string;
  status?: string;
  payment?: string;
  startDate?: string;
  endDate?: string;
}

export function usePaginatedOrders(params: UsePaginatedOrdersParams = {}) {
  const { page = 1, size = 10, search, status, payment, startDate, endDate } = params;
  const query = useQuery({
    queryKey: ["orders", page, size, search, status, payment, startDate, endDate],
    queryFn: async () => {
      const response = await orderApi.list({
        page,
        size,
        ...(search ? { search } : {}),
        ...(status && status !== "all" ? { status } : {}),
        ...(payment && payment !== "all" ? { payment } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      });
      return {
        orders: response.data.map(mapOrderApiItem),
        pagination: response.pagination,
      };
    },
    refetchInterval: 15_000,
  });

  return {
    orders: query.data?.orders ?? [],
    pagination: query.data?.pagination ?? { total: 0, page, size },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Không thể tải đơn hàng."
          : null,
    refetch: query.refetch,
  };
}
