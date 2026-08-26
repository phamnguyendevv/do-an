export interface GhnProvince {
  ProvinceID: number;
  ProvinceName: string;
  Code: string;
}

export interface GhnDistrict {
  DistrictID: number;
  ProvinceID: number;
  DistrictName: string;
  Code: string;
}

export interface GhnWard {
  WardCode: string;
  DistrictID: number;
  WardName: string;
}

export interface GhnFeeResult {
  total: number;
  service_fee: number;
  insurance_fee: number;
  pick_station_fee: number;
  coupon_value: number;
  r2s_fee: number;
}

export interface GhnLeadTimeResult {
  leadtime: number;
  order_date: number;
}

export interface GhnCreateOrderResult {
  order_code: string;
  sort_code: string;
  trans_type: string;
  total_fee: number;
  expected_delivery_time: string;
}

export interface GhnCreateOrderPayload {
  clientOrderCode: string;
  toName: string;
  toPhone: string;
  toAddress: string;
  toWardCode: string;
  toDistrictId: number;
  codAmount?: number;
  note?: string;
  requiredNote?: "CHOTHUHANG" | "CHOXEMHANGKHONGTHU" | "KHONGCHOXEMHANG";
  paymentTypeId?: number; // 1: Shop pays shipping fee, 2: Customer pays shipping fee
  weight: number; // in grams
  items: {
    name: string;
    code?: string;
    quantity: number;
    price: number;
    weight?: number;
  }[];
}

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
    throw new Error(body?.message || body?.error?.message || "Yêu cầu GHN API thất bại");
  }

  return body?.data ?? body;
}

export const ghnApi = {
  async getProvinces(): Promise<GhnProvince[]> {
    return request<GhnProvince[]>("/shipping/ghn/provinces");
  },

  async getDistricts(provinceId: number): Promise<GhnDistrict[]> {
    if (!provinceId) return [];
    return request<GhnDistrict[]>(`/shipping/ghn/districts/${provinceId}`);
  },

  async getWards(districtId: number): Promise<GhnWard[]> {
    if (!districtId) return [];
    return request<GhnWard[]>(`/shipping/ghn/wards/${districtId}`);
  },

  async calculateFee(params: {
    toDistrictId: number;
    toWardCode: string;
    weight: number;
    insuranceValue?: number;
  }): Promise<GhnFeeResult> {
    return request<GhnFeeResult>("/shipping/ghn/calculate-fee", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  async calculateLeadTime(params: {
    toDistrictId: number;
    toWardCode: string;
  }): Promise<GhnLeadTimeResult> {
    return request<GhnLeadTimeResult>("/shipping/ghn/leadtime", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  async createOrder(payload: GhnCreateOrderPayload): Promise<GhnCreateOrderResult> {
    return request<GhnCreateOrderResult>("/shipping/ghn/create-order", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getPrintToken(orderCodes: string[]): Promise<{ token: string; printUrl: string }> {
    return request<{ token: string; printUrl: string }>("/shipping/ghn/print-token", {
      method: "POST",
      body: JSON.stringify({ orderCodes }),
    });
  },

  async getOrderDetail(orderCode: string): Promise<Record<string, unknown>> {
    return request<Record<string, unknown>>(`/shipping/ghn/order/${orderCode}`);
  },
};
