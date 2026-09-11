export type RevenueOverviewResponse = {
  totalRevenue: number;
  pendingRevenue: number;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalBooksSold: number;
  averageOrderValue: number;
};

export type MonthlyRevenueItem = {
  month: string;
  revenue: number;
  orders: number;
  books: number;
};

export type DailyRevenueItem = {
  date: string;
  revenue: number;
  orders: number;
  books: number;
};

export type TopBookItem = {
  bookId: string;
  title: string;
  soldQuantity: number;
  totalRevenue: number;
};

import { apiRequest } from "./api-client";

export const revenueApi = {
  async getOverview(params?: { startDate?: string; endDate?: string }) {
    const search = new URLSearchParams();
    if (params?.startDate) search.set("startDate", params.startDate);
    if (params?.endDate) search.set("endDate", params.endDate);

    const qs = search.toString();
    return apiRequest<RevenueOverviewResponse>(`/admin/revenue/overview${qs ? `?${qs}` : ""}`);
  },

  async getMonthly(months: number = 6) {
    return apiRequest<MonthlyRevenueItem[]>(`/admin/revenue/monthly?months=${months}`);
  },

  async getDaily(params?: { startDate?: string; endDate?: string; days?: number }) {
    const search = new URLSearchParams();
    if (params?.startDate) search.set("startDate", params.startDate);
    if (params?.endDate) search.set("endDate", params.endDate);
    if (params?.days) search.set("days", String(params.days));

    const qs = search.toString();
    return apiRequest<DailyRevenueItem[]>(`/admin/revenue/daily${qs ? `?${qs}` : ""}`);
  },

  async getTopBooks(params?: { limit?: number; startDate?: string; endDate?: string }) {
    const search = new URLSearchParams();
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.startDate) search.set("startDate", params.startDate);
    if (params?.endDate) search.set("endDate", params.endDate);

    const qs = search.toString();
    return apiRequest<TopBookItem[]>(`/admin/revenue/top-books${qs ? `?${qs}` : ""}`);
  },

  // Backward compatibility alias
  async getSummary(params?: { startDate?: string; endDate?: string }) {
    return this.getOverview(params);
  },
};
