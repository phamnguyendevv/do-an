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

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
const API_PREFIX = import.meta.env.VITE_API_PREFIX || "/api/v1";

function getToken() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem("bookstock.token") ?? "";
  } catch {
    return "";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${API_PREFIX}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers || {}),
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(body?.message || body?.error?.message || "Request failed");
  }

  return body?.data ?? body;
}

export const bookApi = {
  async list(params?: { search?: string; category?: string; status?: string; page?: number; size?: number }) {
    const search = new URLSearchParams();
    if (params?.search) search.set("search", params.search);
    if (params?.category) search.set("category", params.category);
    if (params?.status) search.set("status", params.status);
    if (params?.page) search.set("page", String(params.page));
    if (params?.size) search.set("size", String(params.size));

    const qs = search.toString();
    return request<BookListApiResponse>(`/admin/books${qs ? `?${qs}` : ""}`);
  },
  async get(id: number | string) {
    return request<BookApiItem>(`/admin/books/${id}`);
  },
  async create(payload: Partial<BookApiItem>) {
    return request<BookApiItem>(`/admin/books`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async update(id: number | string, payload: Partial<BookApiItem>) {
    return request<BookApiItem>(`/admin/books/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  async remove(id: number | string) {
    return request<boolean>(`/admin/books/${id}`, { method: "DELETE" });
  },
};
