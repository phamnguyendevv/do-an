import { apiRequest } from "./api-client";
import { notificationService } from "@/services/notification-service";

export type PromotionApiItem = {
  id: number;
  code: string;
  name: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  note?: string;
};

function notifyPromotion(payload: Parameters<typeof notificationService.push>[0]) {
  try {
    notificationService.push(payload);
  } catch (error) {
    console.error("Could not save promotion notification:", error);
  }
}

export const promotionApi = {
  list(params?: { search?: string; page?: number; size?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.size) query.set("size", String(params.size));
    const qs = query.toString();
    return apiRequest<{
      data: PromotionApiItem[];
      pagination: { total: number; page: number; size: number };
    }>(`/admin/promotions${qs ? `?${qs}` : ""}`);
  },
  create(payload: Partial<PromotionApiItem>) {
    return apiRequest<PromotionApiItem>("/admin/promotions", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((promotion) => {
      notifyPromotion({
        title: "Khuyến mãi mới",
        description: `${promotion.name} đã được thêm vào hệ thống.`,
        module: "Khuyến mãi",
        tone: "success",
        route: "/promotions",
        showToast: false,
      });
      return promotion;
    });
  },
  update(id: number, payload: Partial<PromotionApiItem>) {
    return apiRequest<PromotionApiItem>(`/admin/promotions/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }).then((promotion) => {
      notifyPromotion({
        title: "Khuyến mãi đã được cập nhật",
        description: `${promotion.name} vừa được chỉnh sửa.`,
        module: "Khuyến mãi",
        tone: "info",
        route: "/promotions",
        showToast: false,
      });
      return promotion;
    });
  },
  remove(id: number) {
    return apiRequest<boolean>(`/admin/promotions/${id}`, { method: "DELETE" }).then((removed) => {
      notifyPromotion({
        title: "Khuyến mãi đã bị xóa",
        description: "Một chương trình khuyến mãi đã được xóa khỏi hệ thống.",
        module: "Khuyến mãi",
        tone: "warning",
        route: "/promotions",
        showToast: false,
      });
      return removed;
    });
  },
  validate(code: string, orderValue: number) {
    return apiRequest<{ valid: boolean; discount: number }>(`/admin/promotions/validate`, {
      method: "POST",
      body: JSON.stringify({ code, orderValue }),
    });
  },
};
