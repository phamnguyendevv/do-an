import { toast } from "sonner";

import type { AppNotification, NotificationTone } from "@/types";
import { apiRequest, getAuthToken } from "@/lib/api-client";
import { getPaymentSocket } from "@/lib/payment-socket";
import { store } from "@/services/store";

export type NotificationPayload = {
  title: string;
  description: string;
  module: string;
  tone?: NotificationTone;
  route?: string;
  showToast?: boolean;
  read?: boolean;
};

export interface NotificationFilters {
  module?: string;
  tone?: NotificationTone;
  read?: boolean;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

interface NotificationPage {
  data: AppNotification[];
  pagination: { total: number; page: number; size: number };
  unreadCount: number;
}

const PENDING_KEY = "bookstock.pending_notifications";
let syncWarningShown = false;
let syncInProgress: Promise<void> | null = null;

function readPending(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is AppNotification =>
            Boolean(item) &&
            typeof item === "object" &&
            typeof item.id === "string" &&
            typeof item.title === "string",
        )
      : [];
  } catch (error) {
    console.error("Could not read queued notifications:", error);
    return [];
  }
}

function writePending(pending: AppNotification[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch (error) {
    console.error("Could not persist queued notifications:", error);
    notifySyncFailure();
  }
}

function queueNotification(notification: AppNotification) {
  const pending = readPending();
  if (!pending.some((item) => item.id === notification.id)) {
    writePending([...pending, notification].slice(-100));
  }
}

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `notification-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const createNotification = (payload: NotificationPayload): AppNotification => ({
  id: createId(),
  title: payload.title,
  description: payload.description,
  module: payload.module,
  tone: payload.tone ?? "info",
  read: payload.read ?? false,
  route: payload.route,
  createdAt: new Date().toISOString(),
});

function upsert(notification: AppNotification, notifyUser = false) {
  const state = store.getSnapshot();
  if (state.notifications.some((item) => item.id === notification.id)) return;
  store.setState({
    notifications: [notification, ...state.notifications].slice(0, 100),
    notificationsUnreadCount: state.notificationsUnreadCount + (notification.read ? 0 : 1),
  });

  if (notifyUser) {
    const handler = {
      info: toast.info,
      success: toast.success,
      warning: toast.warning,
      error: toast.error,
    }[notification.tone];
    handler(notification.title, {
      description: notification.description,
      duration: 3500,
    });
  }
}

function markReadLocally(id: string) {
  const state = store.getSnapshot();
  const target = state.notifications.find((notification) => notification.id === id);
  if (!target || target.read) return;
  store.setState({
    notifications: state.notifications.map((notification) =>
      notification.id === id ? { ...notification, read: true } : notification,
    ),
    notificationsUnreadCount: Math.max(0, state.notificationsUnreadCount - 1),
  });
}

function removeLocally(id: string) {
  const state = store.getSnapshot();
  const target = state.notifications.find((notification) => notification.id === id);
  if (!target) return;
  store.setState({
    notifications: state.notifications.filter((notification) => notification.id !== id),
    notificationsUnreadCount: Math.max(0, state.notificationsUnreadCount - (target.read ? 0 : 1)),
  });
}

function markAllReadLocally() {
  const state = store.getSnapshot();
  store.setState({
    notifications: state.notifications.map((notification) => ({ ...notification, read: true })),
    notificationsUnreadCount: 0,
  });
}

function clearLocally() {
  store.setState({ notifications: [], notificationsUnreadCount: 0 });
}

function notifySyncFailure() {
  if (syncWarningShown) return;
  syncWarningShown = true;
  toast.warning("Thông báo chưa đồng bộ", {
    description: "Đã lưu trên thiết bị này. Sẽ đồng bộ lại khi backend kết nối.",
    duration: 5000,
  });
}

async function syncPendingNotifications() {
  if (!getAuthToken()) return;
  if (syncInProgress) return syncInProgress;

  syncInProgress = (async () => {
    const pending = readPending();
    for (const notification of pending) {
      try {
        await apiRequest<AppNotification>("/notifications", {
          method: "POST",
          data: {
            id: notification.id,
            title: notification.title,
            description: notification.description,
            module: notification.module,
            tone: notification.tone,
            ...(notification.route ? { route: notification.route } : {}),
          },
        });
        writePending(readPending().filter((item) => item.id !== notification.id));
      } catch (error) {
        console.error("Could not sync queued notification:", error);
        notifySyncFailure();
        return;
      }
    }
    syncWarningShown = false;
  })().finally(() => {
    syncInProgress = null;
  });
  return syncInProgress;
}

function localHistory(filters: NotificationFilters): NotificationPage {
  const from = filters.from ? new Date(filters.from).getTime() : Number.NEGATIVE_INFINITY;
  const to = filters.to ? new Date(filters.to).getTime() : Number.POSITIVE_INFINITY;
  const filtered = store.getSnapshot().notifications.filter((notification) => {
    const time = Date.parse(notification.createdAt);
    return (
      (!filters.module || notification.module === filters.module) &&
      (!filters.tone || notification.tone === filters.tone) &&
      (filters.read === undefined || notification.read === filters.read) &&
      time >= from &&
      time <= to
    );
  });
  const page = filters.page ?? 1;
  const size = filters.size ?? 25;
  return {
    data: filtered.slice((page - 1) * size, page * size),
    pagination: { total: filtered.length, page, size },
    unreadCount: store.getSnapshot().notifications.filter((item) => !item.read).length,
  };
}

export const notificationService = {
  list() {
    return store.getSnapshot().notifications;
  },

  unreadCount() {
    return store.getSnapshot().notificationsUnreadCount;
  },

  async load(filters: NotificationFilters = {}): Promise<NotificationPage> {
    if (!getAuthToken()) return localHistory(filters);
    return apiRequest<NotificationPage>("/notifications", {
      method: "GET",
      params: filters,
    });
  },

  refreshFromApi() {
    if (!getAuthToken()) return;
    void syncPendingNotifications();
    void this.load({ page: 1, size: 100 })
      .then(({ data, unreadCount }) => {
        store.setState({
          notifications: data
            .filter(
              (notification) =>
                notification &&
                typeof notification.id === "string" &&
                typeof notification.createdAt === "string",
            )
            .slice(0, 100),
          notificationsUnreadCount: unreadCount,
        });
      })
      .catch((error: unknown) => {
        console.error("Could not load notifications from backend:", error);
        notifySyncFailure();
      });
  },

  connectRealtime() {
    if (!getAuthToken() || typeof window === "undefined") return () => undefined;
    const socket = getPaymentSocket();
    const subscribe = () => socket.emit("notifications:subscribe");
    const receive = (notification: AppNotification) => upsert(notification, true);
    const receiveRead = ({ id }: { id: string }) => markReadLocally(id);
    const receiveDelete = ({ id }: { id: string }) => removeLocally(id);

    socket.on("connect", subscribe);
    socket.on("notification:created", receive);
    socket.on("notification:read", receiveRead);
    socket.on("notification:deleted", receiveDelete);
    socket.on("notification:read-all", markAllReadLocally);
    socket.on("notification:cleared", clearLocally);
    window.addEventListener("online", syncPendingNotifications);
    void syncPendingNotifications();
    if (socket.connected) subscribe();

    return () => {
      socket.off("connect", subscribe);
      socket.off("notification:created", receive);
      socket.off("notification:read", receiveRead);
      socket.off("notification:deleted", receiveDelete);
      socket.off("notification:read-all", markAllReadLocally);
      socket.off("notification:cleared", clearLocally);
      window.removeEventListener("online", syncPendingNotifications);
    };
  },

  push(payload: NotificationPayload) {
    const notification = createNotification(payload);
    upsert(notification);

    if (payload.showToast !== false) {
      const handler = {
        info: toast.info,
        success: toast.success,
        warning: toast.warning,
        error: toast.error,
      }[notification.tone];
      handler(notification.title, {
        description: notification.description,
        duration: 3500,
      });
    }

    if (getAuthToken()) {
      void apiRequest<AppNotification>("/notifications", {
        method: "POST",
        data: {
          id: notification.id,
          title: notification.title,
          description: notification.description,
          module: notification.module,
          tone: notification.tone,
          ...(notification.route ? { route: notification.route } : {}),
        },
      }).catch((error: unknown) => {
        console.error("Could not persist notification to backend:", error);
        queueNotification(notification);
        notifySyncFailure();
      });
    }
    return notification;
  },

  markRead(id: string) {
    markReadLocally(id);
    if (getAuthToken()) {
      void apiRequest(`/notifications/${encodeURIComponent(id)}/read`, {
        method: "PATCH",
      }).catch((error: unknown) => {
        console.error("Could not mark notification as read:", error);
        notifySyncFailure();
      });
    }
  },

  markAllRead() {
    markAllReadLocally();
    if (getAuthToken()) {
      void apiRequest("/notifications/read-all", { method: "PATCH" }).catch((error: unknown) => {
        console.error("Could not mark all notifications as read:", error);
        notifySyncFailure();
      });
    }
  },

  clear() {
    clearLocally();
    if (getAuthToken()) {
      void apiRequest("/notifications", { method: "DELETE" }).catch((error: unknown) => {
        console.error("Could not clear notifications:", error);
        notifySyncFailure();
      });
    }
  },
};
