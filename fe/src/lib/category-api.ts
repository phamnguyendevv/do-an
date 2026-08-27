export type CategoryApiItem = {
  id: number;
  name: string;
  description?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type CategoryListApiResponse = {
  data: CategoryApiItem[];
  pagination: { total: number; page: number; size: number };
};

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
import { apiRequest } from "./api-client";

export const categoryApi = {
  async list(params?: { search?: string; page?: number; size?: number }) {
    const search = new URLSearchParams();
    if (params?.search) search.set("search", params.search);
    if (params?.page) search.set("page", String(params.page));
    if (params?.size) search.set("size", String(params.size));

    const qs = search.toString();
    return apiRequest<CategoryListApiResponse>(`/admin/categories${qs ? `?${qs}` : ""}`);
  },

  async get(id: number | string) {
    return apiRequest<CategoryApiItem>(`/admin/categories/${id}`);
  },

  async create(payload: Partial<CategoryApiItem>) {
    return apiRequest<CategoryApiItem>(`/admin/categories`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(id: number | string, payload: Partial<CategoryApiItem>) {
    return apiRequest<CategoryApiItem>(`/admin/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async remove(id: number | string) {
    return apiRequest<boolean>(`/admin/categories/${id}`, { method: "DELETE" });
  },
};
