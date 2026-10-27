import { useMemo, useSyncExternalStore } from "react";
import type { Order } from "@/types";
import { store } from "@/services/store";

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
  const orders = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot).orders;

  const result = useMemo(() => {
    const query = search?.trim().toLocaleLowerCase();
    const from = startDate ? Date.parse(startDate) : undefined;
    const to = endDate ? Date.parse(endDate) + 24 * 60 * 60 * 1000 : undefined;
    const filtered = orders.filter((order) => {
      const created = Date.parse(order.createdAt);
      return (
        (!query ||
          (order.orderCode ?? order.id).toLocaleLowerCase().includes(query) ||
          order.customerName.toLocaleLowerCase().includes(query) ||
          order.customerPhone.toLocaleLowerCase().includes(query)) &&
        (!status || status === "all" || order.status === status) &&
        (!payment || payment === "all" || order.payment === payment) &&
        (from === undefined || created >= from) &&
        (to === undefined || created < to)
      );
    });
    const safePage = Math.max(1, Math.floor(page));
    const safeSize = Math.max(1, Math.floor(size));
    return {
      items: filtered.slice((safePage - 1) * safeSize, safePage * safeSize),
      pagination: { total: filtered.length, page: safePage, size: safeSize },
    };
  }, [endDate, orders, page, payment, search, size, startDate, status]);

  return {
    orders: result.items,
    pagination: result.pagination,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: () => Promise.resolve({ data: result }),
  };
}
