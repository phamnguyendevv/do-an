export type SupplierApiItem = {
  id: number;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type SupplierListApiResponse = {
  data: SupplierApiItem[];
  pagination: { total: number; page: number; size: number };
};

import { apiRequest } from "./api-client";

export const supplierApi = {
  async list(params?: { search?: string; page?: number; size?: number }) {
    const search = new URLSearchParams();
    if (params?.search) search.set("search", params.search);
    if (params?.page) search.set("page", String(params.page));
    if (params?.size) search.set("size", String(params.size));

    const qs = search.toString();
    return apiRequest<SupplierListApiResponse>(`/admin/suppliers${qs ? `?${qs}` : ""}`);
  },

  async get(id: number | string) {
    return apiRequest<SupplierApiItem>(`/admin/suppliers/${id}`);
  },

  async create(payload: Partial<SupplierApiItem>) {
    return apiRequest<SupplierApiItem>(`/admin/suppliers`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(id: number | string, payload: Partial<SupplierApiItem>) {
    return apiRequest<SupplierApiItem>(`/admin/suppliers/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async remove(id: number | string) {
    return apiRequest<boolean>(`/admin/suppliers/${id}`, { method: "DELETE" });
  },
};
