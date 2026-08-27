export type BookApiItem = {
  id: number;
  title: string;
  author: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  status?: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  createdAt?: string | Date;
};

export type BookListApiResponse = {
  data: BookApiItem[];
  pagination: { total: number; page: number; size: number };
};

import { apiRequest } from "./api-client";

export const bookApi = {
  async list(params?: { search?: string; category?: string; status?: string; page?: number; size?: number; minPrice?: number; maxPrice?: number; startDate?: string; endDate?: string; sortBy?: string; sortOrder?: string }) {
    const search = new URLSearchParams();
    if (params?.search) search.set("search", params.search);
    if (params?.category) search.set("category", params.category);
    if (params?.status) search.set("status", params.status);
    if (params?.page) search.set("page", String(params.page));
    if (params?.size) search.set("size", String(params.size));
    if (params?.minPrice !== undefined) search.set("minPrice", String(params.minPrice));
    if (params?.maxPrice !== undefined) search.set("maxPrice", String(params.maxPrice));
    if (params?.startDate) search.set("startDate", params.startDate);
    if (params?.endDate) search.set("endDate", params.endDate);
    if (params?.sortBy) search.set("sortBy", params.sortBy);
    if (params?.sortOrder) search.set("sortOrder", params.sortOrder);

    const qs = search.toString();
    return apiRequest<BookListApiResponse>(`/admin/books${qs ? `?${qs}` : ""}`);
  },
  async get(id: number | string) {
    return apiRequest<BookApiItem>(`/admin/books/${id}`);
  },
  async create(payload: Partial<BookApiItem>) {
    return apiRequest<BookApiItem>(`/admin/books`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async update(id: number | string, payload: Partial<BookApiItem>) {
    return apiRequest<BookApiItem>(`/admin/books/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  async remove(id: number | string) {
    return apiRequest<boolean>(`/admin/books/${id}`, { method: "DELETE" });
  },
};
