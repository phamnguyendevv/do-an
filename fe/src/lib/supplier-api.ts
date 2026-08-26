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
    throw new Error(body?.message || body?.error?.message || "Yêu cầu thất bại");
  }

  return body?.data ?? body;
}

export const supplierApi = {
  async list(params?: { search?: string; page?: number; size?: number }) {
    const search = new URLSearchParams();
    if (params?.search) search.set("search", params.search);
    if (params?.page) search.set("page", String(params.page));
    if (params?.size) search.set("size", String(params.size));

    const qs = search.toString();
    try {
      return await request<SupplierListApiResponse>(`/admin/suppliers${qs ? `?${qs}` : ""}`);
    } catch {
      return await request<SupplierListApiResponse>(`/users/suppliers${qs ? `?${qs}` : ""}`);
    }
  },

  async get(id: number | string) {
    return request<SupplierApiItem>(`/admin/suppliers/${id}`);
  },

  async create(payload: Partial<SupplierApiItem>) {
    return request<SupplierApiItem>(`/admin/suppliers`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(id: number | string, payload: Partial<SupplierApiItem>) {
    return request<boolean | SupplierApiItem>(`/admin/suppliers/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async remove(id: number | string) {
    return request<boolean>(`/admin/suppliers/${id}`, {
      method: "DELETE",
    });
  },
};
