import { useQuery } from "@tanstack/react-query";
import { orderApi, type OrderApiItem } from "@/lib/order-api";
import type { Order, OrderStatus, PaymentStatus } from "@/types";

export interface UsePaginatedOrdersParams {
  page?: number;
  size?: number;
  search?: string;
  status?: string;
  payment?: string;
  startDate?: string;
  endDate?: string;
}

export const mapApiOrder = (o: OrderApiItem): Order => {
  return {
    id: String(o.id),
    orderCode: o.orderCode,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerAddress: o.customerAddress,
    provinceId: o.provinceId,
    districtId: o.districtId,
    wardCode: o.wardCode,
    items: (o.items || []).map((it) => ({
      bookId: String(it.bookId),
      title: it.title,
      quantity: it.quantity,
      price: Number(it.price),
    })),
    subtotal: Number(o.subtotal),
    discount: Number(o.discount),
    shippingFee: Number(o.shippingFee),
    total: Number(o.total),
    payment: o.payment as PaymentStatus,
    shippingMethod: o.shippingMethod,
    trackingCode: o.trackingCode,
    note: o.note,
    status: o.status as OrderStatus,
    createdAt:
      typeof o.createdAt === "string"
        ? o.createdAt
        : new Date(o.createdAt ?? Date.now()).toISOString(),
  };
};

export function usePaginatedOrders(params: UsePaginatedOrdersParams = {}) {
  const { page = 1, size = 10, search, status, payment, startDate, endDate } = params;

  const query = useQuery({
    queryKey: ["orders", "paginated", { page, size, search, status, payment, startDate, endDate }],
    queryFn: async () => {
      const p: any = { page, size };
      if (search?.trim()) p["search"] = search.trim();
      if (status && status !== "all") p["status"] = status;
      if (payment && payment !== "all") p["payment"] = payment;
      if (startDate) p["startDate"] = startDate;
      if (endDate) p["endDate"] = endDate;

      const res: any = await orderApi.list(p);

      let items: OrderApiItem[] = [];
      let total = 0;

      if (Array.isArray(res?.data)) {
        items = res.data;
        total = res.pagination?.total ?? res.data.length;
      } else if (Array.isArray(res)) {
        items = res;
        total = res.length;
      }

      return {
        items: items.map(mapApiOrder),
        pagination: {
          total,
          page: res?.pagination?.page ?? page,
          size: res?.pagination?.size ?? size,
        },
      };
    },
    placeholderData: (prev) => prev,
    staleTime: 10_000,
  });

  return {
    orders: query.data?.items ?? [],
    pagination: query.data?.pagination ?? { total: 0, page, size },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
