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

export interface GhnUpdateOrderPayload {
  /** GHN Order Code (tracking code) — bắt buộc */
  order_code: string;
  /** Tên người nhận */
  to_name?: string;
  /** SĐT người nhận */
  to_phone?: string;
  /** Địa chỉ chi tiết người nhận */
  to_address?: string;
  /** Mã phường/xã người nhận */
  to_ward_code?: string;
  /** Mã quận/huyện người nhận */
  to_district_id?: number;
  /** Tiền thu hộ COD (max 10.000.000) */
  cod_amount?: number;
  /** Nội dung đơn hàng */
  content?: string;
  /** Trọng lượng (gram, max 50.000) */
  weight?: number;
  /** Chiều dài (cm, max 200) */
  length?: number;
  /** Chiều rộng (cm, max 200) */
  width?: number;
  /** Chiều cao (cm, max 200) */
  height?: number;
  /** Giá trị bảo hiểm (max 5.000.000) */
  insurance_value?: number;
  /** 1: Shop trả phí, 2: Khách trả phí */
  payment_type_id?: 1 | 2;
  /** Ghi chú cho shipper */
  note?: string;
  /** Loại ghi chú bắt buộc */
  required_note?: "CHOTHUHANG" | "CHOXEMHANGKHONGTHU" | "KHONGCHOXEMHANG";
  /** Danh sách sản phẩm */
  items?: {
    name: string;
    code?: string;
    quantity: number;
    price: number;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
  }[];
}

import { apiRequest } from "./api-client";

export interface GhnOrderStatus {
  order_code: string;
  client_order_code: string;
  status: string; // GHN raw status: "ready_to_pick", "picking", "delivering", "delivered", "return", ...
  status_name: string;
  created_date: string;
  updated_date: string;
  to_name: string;
  to_phone: string;
  to_address: string;
  note: string;
  cod_amount: number;
  content: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  service_type_id: number;
  payment_type_id: number;
  expected_delivery_time: string;
  total_fee: number;
  log?: Array<{ status: string; updated_date: string; description?: string }>;
}

export interface GhnOrderLog {
  status: string;
  updated_date: string;
  description?: string;
}

export const ghnApi = {
  async getProvinces(): Promise<GhnProvince[]> {
    return apiRequest<GhnProvince[]>("/shipping/ghn/provinces");
  },

  async getDistricts(provinceId: number): Promise<GhnDistrict[]> {
    if (!provinceId) return [];
    return apiRequest<GhnDistrict[]>(`/shipping/ghn/districts/${provinceId}`);
  },

  async getWards(districtId: number): Promise<GhnWard[]> {
    if (!districtId) return [];
    return apiRequest<GhnWard[]>(`/shipping/ghn/wards/${districtId}`);
  },

  async calculateFee(params: {
    toDistrictId: number;
    toWardCode: string;
    weight: number;
    insuranceValue?: number;
  }): Promise<GhnFeeResult> {
    return apiRequest<GhnFeeResult>("/shipping/ghn/calculate-fee", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  async calculateLeadTime(params: {
    toDistrictId: number;
    toWardCode: string;
  }): Promise<GhnLeadTimeResult> {
    return apiRequest<GhnLeadTimeResult>("/shipping/ghn/leadtime", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  async createOrder(payload: GhnCreateOrderPayload): Promise<GhnCreateOrderResult> {
    return apiRequest<GhnCreateOrderResult>("/shipping/ghn/create-order", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getPrintToken(orderCodes: string[]): Promise<{ token: string; printUrl: string }> {
    return apiRequest<{ token: string; printUrl: string }>("/shipping/ghn/print-token", {
      method: "POST",
      body: JSON.stringify({ orderCodes }),
    });
  },

  async getOrderDetail(orderCode: string): Promise<GhnOrderStatus> {
    return apiRequest<GhnOrderStatus>(`/shipping/ghn/order/${orderCode}`);
  },

  async cancelOrder(orderCodes: string[]): Promise<unknown> {
    return apiRequest<unknown>("/shipping/ghn/cancel-order", {
      method: "POST",
      body: JSON.stringify({ orderCodes }),
    });
  },

  async updateOrder(payload: GhnUpdateOrderPayload): Promise<{ code: number; message: string }> {
    return apiRequest<{ code: number; message: string }>("/shipping/ghn/update-order", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

/** Map GHN raw status string to our internal ShippingStatus */
export function mapGhnStatus(ghnStatus: string): import("@/types").ShippingStatus {
  const s = ghnStatus?.toLowerCase() ?? "";
  if (s === "ready_to_pick" || s === "storing") return "WAITING_PICKUP";
  if (s === "picking" || s === "picked") return "PICKED_UP";
  if (
    s === "transporting" ||
    s === "sorting" ||
    s === "in_transit" ||
    s.includes("transit") ||
    s === "delivering"
  )
    return "IN_TRANSIT";
  if (s === "delivery_fail" || s === "failed") return "FAILED";
  if (
    s === "wait_to_return" ||
    s === "return" ||
    s === "returned" ||
    s === "return_transporting" ||
    s === "return_sorting"
  )
    return "RETURNED";
  if (s === "delivered") return "DELIVERED";
  if (s === "out_for_delivery") return "OUT_FOR_DELIVERY";
  return "IN_TRANSIT";
}
