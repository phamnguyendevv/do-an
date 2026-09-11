import { apiRequest } from "./api-client";

export type CustomerApiItem = {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  note?: string;
  totalOrders?: number;
  totalSpent?: number;
  lastOrderAt?: string;
};

const normalizePhone = (phone?: string) => {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("84") ? `0${digits.slice(2)}` : digits;
};

export const customersApi = {
  async list(search?: string) {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    return apiRequest<{
      data: CustomerApiItem[];
      pagination: { total: number; page: number; size: number };
    }>(`/admin/customers${qs}`);
  },
};

export const customerApi = {
  lookupByPhone(phone?: string) {
    const normalized = normalizePhone(phone);
    if (!normalized) return Promise.resolve(null as CustomerApiItem | null);
    return apiRequest<CustomerApiItem | null>(
      `/admin/customers/lookup?phone=${encodeURIComponent(normalized)}`,
    );
  },
  list(params?: { search?: string; page?: number; size?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.size) query.set("size", String(params.size));
    const qs = query.toString();
    return apiRequest<{
      data: CustomerApiItem[];
      pagination: { total: number; page: number; size: number };
    }>(`/admin/customers${qs ? `?${qs}` : ""}`);
  },
  create(payload: Partial<CustomerApiItem>) {
    return apiRequest<CustomerApiItem>("/admin/customers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id: number, payload: Partial<CustomerApiItem>) {
    return apiRequest<CustomerApiItem>(`/admin/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  remove(id: number) {
    return apiRequest<boolean>(`/admin/customers/${id}`, { method: "DELETE" });
  },
};
