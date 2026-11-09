import type { Shipping, ShippingStatus } from "@/types";
import { SHIPPING_STATUS_TRANSITIONS } from "@/types";
import { nextId, store } from "./store";
import { serviceFailure, serviceSuccess, type ServiceResult } from "./service-result";
import { orderService } from "./order-service";

export const shippingService = {
  list(): ServiceResult<Shipping[]> {
    return serviceSuccess(store.getSnapshot().shipments);
  },

  get(id: string): ServiceResult<Shipping> {
    const shipment = store.getSnapshot().shipments.find((item) => item.id === id);
    return shipment
      ? serviceSuccess(shipment)
      : serviceFailure("NOT_FOUND", "Không tìm thấy vận đơn.");
  },

  getByOrder(orderId: string): ServiceResult<Shipping> {
    const shipment = store.getSnapshot().shipments.find((item) => item.orderId === orderId);
    return shipment
      ? serviceSuccess(shipment)
      : serviceFailure("NOT_FOUND", "Đơn hàng chưa có vận đơn.");
  },

  create(input: Omit<Shipping, "id">): ServiceResult<Shipping> {
    const state = store.getSnapshot();
    if (!state.orders.some((order) => order.id === input.orderId)) {
      return serviceFailure("NOT_FOUND", "Không tìm thấy đơn hàng liên kết.");
    }
    if (state.shipments.some((shipment) => shipment.orderId === input.orderId)) {
      return serviceFailure("CONFLICT", "Đơn hàng đã có vận đơn.");
    }
    if (
      !input.customerName.trim() ||
      !input.carrier.trim() ||
      !input.trackingNumber.trim() ||
      !input.address.trim() ||
      !Number.isFinite(input.shippingFee) ||
      input.shippingFee < 0 ||
      !Number.isFinite(Date.parse(input.expectedDelivery))
    ) {
      return serviceFailure("VALIDATION_ERROR", "Thông tin vận chuyển không hợp lệ.");
    }
    const shipment: Shipping = { ...input, id: nextId("SHP", state.shipments, 3000) };
    try {
      store.setState({ shipments: [shipment, ...state.shipments] });
      return serviceSuccess(shipment);
    } catch (error) {
      return serviceFailure(
        "PERSISTENCE_ERROR",
        error instanceof Error ? error.message : "Không thể lưu vận đơn.",
      );
    }
  },

  updateStatus(id: string, status: ShippingStatus): ServiceResult<Shipping> {
    const state = store.getSnapshot();
    const shipment = state.shipments.find((item) => item.id === id);
    if (!shipment) return serviceFailure("NOT_FOUND", "Không tìm thấy vận đơn.");
    if (shipment.status === status) return serviceSuccess(shipment);
    if (!SHIPPING_STATUS_TRANSITIONS[shipment.status].includes(status)) {
      return serviceFailure("INVALID_TRANSITION", "Không thể chuyển trạng thái vận chuyển này.");
    }
    const linkedOrder = state.orders.find(
      (order) => order.id === shipment.orderId || order.orderCode === shipment.orderId,
    );
    if (!linkedOrder) return serviceFailure("NOT_FOUND", "Không tìm thấy đơn hàng liên kết.");
    const orderStatus =
      status === "PICKED_UP" || status === "IN_TRANSIT" || status === "OUT_FOR_DELIVERY"
        ? "SHIPPING"
        : status === "DELIVERED"
          ? "DELIVERED"
          : status === "FAILED"
            ? "FAILED"
            : status === "RETURNED"
              ? "RETURNED"
              : status === "CANCELLED"
                ? "CANCELLED"
                : null;
    if (orderStatus) {
      const result = orderService.updateFromShipment(linkedOrder.id, orderStatus, status);
      if (!result.ok) {
        return serviceFailure(
          result.code ?? "INVALID_TRANSITION",
          result.error ?? "Không thể đồng bộ trạng thái đơn hàng.",
        );
      }
      const updated = store.getSnapshot().shipments.find((item) => item.id === id);
      return updated
        ? serviceSuccess(updated)
        : serviceFailure("NOT_FOUND", "Không tìm thấy vận đơn sau khi cập nhật.");
    }

    const updated = { ...shipment, status };
    try {
      store.setState({
        shipments: state.shipments.map((item) => (item.id === id ? updated : item)),
      });
      return serviceSuccess(updated);
    } catch (error) {
      return serviceFailure(
        "PERSISTENCE_ERROR",
        error instanceof Error ? error.message : "Không thể cập nhật vận đơn.",
      );
    }
  },
};
