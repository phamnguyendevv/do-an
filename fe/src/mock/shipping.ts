import type { Shipping, ShippingStatus } from "@/types";
import { mockOrders } from "./orders";

const carriers = ["Giao Hàng Nhanh", "Viettel Post", "GHTK", "J&T Express", "Vietnam Post"];

const statuses: ShippingStatus[] = [
  "WAITING_PICKUP",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
  "RETURNED",
];

export const mockShipments: Shipping[] = mockOrders.slice(0, 18).map((order, i) => ({
  id: `SHP-${3000 + i + 1}`,
  orderId: order.id,
  customerName: order.customerName,
  carrier: carriers[i % carriers.length]!,
  trackingNumber: `VN${480000000 + i * 7919}`,
  shippingFee: order.shippingFee || 25000,
  expectedDelivery: new Date(2026, 7, ((i * 2) % 14) + 3).toISOString(),
  status: statuses[i % statuses.length]!,
  address: order.customerAddress,
}));

export const trackingSteps: Array<{ key: string; label: string }> = [
  { key: "created", label: "Đơn hàng được tạo" },
  { key: "confirmed", label: "Đã xác nhận" },
  { key: "preparing", label: "Đang chuẩn bị hàng" },
  { key: "picked_up", label: "Đơn vị vận chuyển đã lấy hàng" },
  { key: "in_transit", label: "Đang vận chuyển" },
  { key: "out_for_delivery", label: "Đang giao đến khách" },
  { key: "delivered", label: "Giao thành công" },
];

export const stepIndexByStatus: Record<ShippingStatus, number> = {
  WAITING_PICKUP: 2,
  PICKED_UP: 3,
  IN_TRANSIT: 4,
  OUT_FOR_DELIVERY: 5,
  DELIVERED: 6,
  FAILED: 5,
  RETURNED: 5,
};
