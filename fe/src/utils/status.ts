import type { StatusTone } from "@/components/shared/status-badge";
import type { BookStatus, OrderStatus, PaymentStatus, ShippingStatus } from "@/types";

export const bookStatusLabel: Record<BookStatus, string> = {
  IN_STOCK: "Còn hàng",
  LOW_STOCK: "Sắp hết",
  OUT_OF_STOCK: "Hết hàng",
  DISCONTINUED: "Ngừng kinh doanh",
};

export const bookStatusTone: Record<BookStatus, StatusTone> = {
  IN_STOCK: "success",
  LOW_STOCK: "warning",
  OUT_OF_STOCK: "error",
  DISCONTINUED: "neutral",
};

export const orderStatusLabel: Record<OrderStatus, string> = {
  PENDING: "Chờ xử lý",
  CONFIRMED: "Đã xác nhận",
  PREPARING: "Đang chuẩn bị",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã hủy",
  FAILED: "Thất bại",
  RETURNED: "Hoàn hàng",
};

export const orderStatusTone: Record<OrderStatus, StatusTone> = {
  PENDING: "neutral",
  CONFIRMED: "info",
  PREPARING: "info",
  SHIPPING: "warning",
  DELIVERED: "success",
  CANCELLED: "error",
  FAILED: "error",
  RETURNED: "warning",
};

export const paymentLabel: Record<PaymentStatus, string> = {
  PAID: "Đã thanh toán",
  UNPAID: "Chưa thanh toán",
  REFUNDED: "Đã hoàn tiền",
};

export const paymentTone: Record<PaymentStatus, StatusTone> = {
  PAID: "success",
  UNPAID: "warning",
  REFUNDED: "neutral",
};

export const shippingStatusLabel: Record<ShippingStatus, string> = {
  WAITING_PICKUP: "Chờ lấy hàng",
  PICKED_UP: "Đã lấy hàng",
  IN_TRANSIT: "Đang vận chuyển",
  OUT_FOR_DELIVERY: "Đang giao",
  DELIVERED: "Đã giao",
  FAILED: "Giao thất bại",
  RETURNED: "Hoàn hàng",
};

export const shippingStatusTone: Record<ShippingStatus, StatusTone> = {
  WAITING_PICKUP: "neutral",
  PICKED_UP: "info",
  IN_TRANSIT: "info",
  OUT_FOR_DELIVERY: "warning",
  DELIVERED: "success",
  FAILED: "error",
  RETURNED: "warning",
};
