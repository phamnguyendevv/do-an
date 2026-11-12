import { beforeEach, describe, expect, it } from "vitest";

import { notificationService } from "@/services/notification-service";
import { store } from "@/services/store";

describe("notificationService", () => {
  beforeEach(() => {
    store.setState({ notifications: [], notificationsUnreadCount: 0 });
  });

  it("counts unread notifications and marks an item read only once", () => {
    const notification = notificationService.push({
      title: "Đơn hàng mới",
      description: "Đơn hàng đã được tạo.",
      module: "Đơn hàng",
      showToast: false,
    });

    expect(notificationService.unreadCount()).toBe(1);
    notificationService.markRead(notification.id);
    notificationService.markRead(notification.id);
    expect(notificationService.unreadCount()).toBe(0);
  });

  it("filters local notification history by module, tone, read state, and date", async () => {
    const recent = notificationService.push({
      title: "Nhập kho",
      description: "Phiếu nhập đã tạo.",
      module: "Kho hàng",
      tone: "success",
      showToast: false,
    });
    notificationService.push({
      title: "Đơn hàng",
      description: "Đơn hàng đã tạo.",
      module: "Đơn hàng",
      tone: "info",
      showToast: false,
    });

    const result = await notificationService.load({
      module: "Kho hàng",
      tone: "success",
      read: false,
      from: new Date(Date.now() - 60_000).toISOString(),
      page: 1,
      size: 10,
    });

    expect(result.data.map((item) => item.id)).toEqual([recent.id]);
    expect(result.pagination.total).toBe(1);
    expect(result.unreadCount).toBe(2);
  });

  it("marks all notifications read and clears the unread badge", () => {
    notificationService.push({
      title: "Sách cập nhật",
      description: "Thông tin sách đã cập nhật.",
      module: "Sách",
      showToast: false,
    });

    notificationService.markAllRead();
    expect(notificationService.unreadCount()).toBe(0);
    expect(notificationService.list().every((item) => item.read)).toBe(true);

    notificationService.clear();
    expect(notificationService.list()).toEqual([]);
    expect(notificationService.unreadCount()).toBe(0);
  });
});
