export type OrderApiItem = {
  id: number;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  provinceId?: number;
  districtId?: number;
  wardCode?: string;
  items: Array<{
    bookId: number | string;
    title: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  payment: "PAID" | "UNPAID" | "REFUNDED";
  shippingMethod: string;
  trackingCode?: string;
  status:
    "PENDING" | "CONFIRMED" | "PREPARING" | "SHIPPING" | "DELIVERED" | "CANCELLED" | "RETURNED";
  note?: string;
  createdAt: string;
  updatedAt?: string;
};

export type OrderListApiResponse = {
  data: OrderApiItem[];
  pagination: { total: number; page: number; size: number };
};

import { apiRequest } from "./api-client";

export const orderApi = {
  async list(params?: {
    search?: string;
    status?: string;
    payment?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.search) search.set("search", params.search);
    if (params?.status) search.set("status", params.status);
    if (params?.payment) search.set("payment", params.payment);
    if (params?.startDate) search.set("startDate", params.startDate);
    if (params?.endDate) search.set("endDate", params.endDate);
    if (params?.page) search.set("page", String(params.page));
    if (params?.size) search.set("size", String(params.size));

    const qs = search.toString();
    return apiRequest<OrderListApiResponse>(`/admin/orders${qs ? `?${qs}` : ""}`);
  },

  async get(id: number | string) {
    return apiRequest<OrderApiItem>(`/admin/orders/${id}`);
  },

  async create(payload: {
    orderCode?: string;
    customerId?: number;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    provinceId?: number;
    districtId?: number;
    wardCode?: string;
    items: Array<{
      bookId: number | string;
      title: string;
      quantity: number;
      price: number;
    }>;
    shippingFee?: number;
    discount?: number;
    promotionCode?: string;
    shippingMethod?: string;
    trackingCode?: string;
    note?: string;
    status?: string;
    payment?: string;
  }) {
    return apiRequest<OrderApiItem>(`/admin/orders`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateStatus(id: number | string, status: string) {
    return apiRequest<OrderApiItem>(`/admin/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },

  async updatePayment(id: number | string, payment: string) {
    return apiRequest<OrderApiItem>(`/admin/orders/${id}/payment`, {
      method: "PUT",
      body: JSON.stringify({ payment }),
    });
  },

  async update(
    id: number | string,
    payload: {
      customerName?: string;
      customerPhone?: string;
      customerAddress?: string;
      provinceId?: number;
      districtId?: number;
      wardCode?: string;
      note?: string;
      shippingFee?: number;
      discount?: number;
    },
  ) {
    return apiRequest<OrderApiItem>(`/admin/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async getHistories(id: number | string) {
    return apiRequest<import("@/types").OrderHistoryItem[]>(`/admin/orders/${id}/histories`);
  },

  async listHistories(params?: {
    search?: string;
    orderId?: number;
    orderCode?: string;
    action?: string;
    actor?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.search) search.set("search", params.search);
    if (params?.orderId) search.set("orderId", String(params.orderId));
    if (params?.orderCode) search.set("orderCode", params.orderCode);
    if (params?.action) search.set("action", params.action);
    if (params?.actor) search.set("actor", params.actor);
    if (params?.startDate) search.set("startDate", params.startDate);
    if (params?.endDate) search.set("endDate", params.endDate);
    if (params?.page) search.set("page", String(params.page));
    if (params?.size) search.set("size", String(params.size));

    const qs = search.toString();
    return apiRequest<{
      data: import("@/types").OrderHistoryItem[];
      pagination: { total: number; page: number; size: number };
    }>(`/admin/orders/histories/all${qs ? `?${qs}` : ""}`);
  },

  async addNote(id: number | string, note: string) {
    return apiRequest<import("@/types").OrderHistoryItem>(`/admin/orders/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  },
};

export const sepayApi = {
  async getConfig() {
    return apiRequest<{
      success: boolean;
      bank: string;
      accountNumber: string;
      accountName: string;
      webhookUrl: string;
    }>(`/payment/sepay/config`);
  },

  async checkOrderStatus(orderCode: string) {
    return apiRequest<{
      success: boolean;
      found: boolean;
      orderCode?: string;
      status?: string;
      payment?: string;
      total?: number;
    }>(`/payment/sepay/status/${encodeURIComponent(orderCode)}`);
  },
};
