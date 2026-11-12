import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNotifications, useUnreadNotificationCount } from "@/hooks/use-store";
import { notificationService } from "@/services/notification-service";
import type { AppNotification, NotificationTone } from "@/types";

export const Route = createFileRoute("/notifications/")({
  head: () => ({
    meta: [
      { title: "Thông báo — BookStock" },
      { name: "description", content: "Lịch sử thông báo và sự kiện quan trọng của hệ thống." },
    ],
  }),
  component: NotificationsPage,
});

const modules = [
  "Dashboard",
  "Bán tại quầy (POS)",
  "Sách",
  "Danh mục",
  "Nhà cung cấp",
  "Kho hàng",
  "Đơn hàng",
  "Vận chuyển",
  "Thống kê",
  "Trợ lý AI",
  "Người dùng",
  "Khách hàng",
  "Khuyến mãi",
  "Lịch sử hoạt động",
];

function NotificationsPage() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const [module, setModule] = useState("all");
  const [tone, setTone] = useState("all");
  const [read, setRead] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const pageSize = 25;

  const filters = useMemo(
    () => ({
      ...(module !== "all" ? { module } : {}),
      ...(tone !== "all" ? { tone: tone as NotificationTone } : {}),
      ...(read !== "all" ? { read: read === "unread" } : {}),
      ...(from ? { from: new Date(`${from}T00:00:00`).toISOString() } : {}),
      ...(to ? { to: new Date(`${to}T23:59:59.999`).toISOString() } : {}),
    }),
    [module, tone, read, from, to],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    void notificationService
      .load({ ...filters, page, size: pageSize })
      .then((result) => {
        if (!active) return;
        setRows(result.data);
        setTotal(result.pagination.total);
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error("Could not load notification history:", error);
        setLoadError(
          "Không thể tải lịch sử từ máy chủ. Đang hiển thị thông báo đã lưu trên thiết bị.",
        );
        const fallback = notifications.filter((notification) =>
          matchesFilters(notification, filters),
        );
        setRows(fallback.slice((page - 1) * pageSize, page * pageSize));
        setTotal(fallback.length);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters, page, notifications]);

  const unreadCount = useUnreadNotificationCount();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const updateFilter = (update: () => void) => {
    update();
    setPage(1);
  };

  const openNotification = (notification: AppNotification) => {
    notificationService.markRead(notification.id);
    if (notification.route) navigate({ to: notification.route as never });
  };

  return (
    <AppShell crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Thông báo" }]}>
      <PageContainer>
        <PageHeader
          title="Trung tâm thông báo"
          description="Theo dõi sự kiện quan trọng, thanh toán và thay đổi trong các phân hệ."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={unreadCount === 0}
                onClick={() => notificationService.markAllRead()}
              >
                <CheckCheck className="mr-1.5 h-4 w-4" /> Đánh dấu đã đọc
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={notifications.length === 0}
                onClick={() => {
                  notificationService.clear();
                  setTotal(0);
                  toast.success("Đã xóa thông báo trên tài khoản này.");
                }}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Xóa tất cả
              </Button>
            </div>
          }
        />

        <section
          aria-label="Bộ lọc thông báo"
          className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <Select value={module} onValueChange={(value) => updateFilter(() => setModule(value))}>
            <SelectTrigger aria-label="Lọc theo phân hệ">
              <SelectValue placeholder="Tất cả phân hệ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phân hệ</SelectItem>
              {modules.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tone} onValueChange={(value) => updateFilter(() => setTone(value))}>
            <SelectTrigger aria-label="Lọc theo mức độ">
              <SelectValue placeholder="Tất cả mức độ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả mức độ</SelectItem>
              <SelectItem value="info">Thông tin</SelectItem>
              <SelectItem value="success">Thành công</SelectItem>
              <SelectItem value="warning">Cảnh báo</SelectItem>
              <SelectItem value="error">Lỗi</SelectItem>
            </SelectContent>
          </Select>

          <Select value={read} onValueChange={(value) => updateFilter(() => setRead(value))}>
            <SelectTrigger aria-label="Lọc theo trạng thái đọc">
              <SelectValue placeholder="Mọi trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi trạng thái</SelectItem>
              <SelectItem value="unread">Chưa đọc</SelectItem>
              <SelectItem value="read">Đã đọc</SelectItem>
            </SelectContent>
          </Select>

          <Input
            aria-label="Từ ngày"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => updateFilter(() => setFrom(event.target.value))}
          />
          <Input
            aria-label="Đến ngày"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => updateFilter(() => setTo(event.target.value))}
          />
        </section>

        {loadError ? (
          <div
            role="status"
            className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-300"
          >
            {loadError}
          </div>
        ) : null}

        <section
          aria-label="Lịch sử thông báo"
          className="mt-4 overflow-hidden rounded-lg border bg-card"
        >
          {loading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Đang tải thông báo…</p>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Không có thông báo phù hợp</p>
              <p className="text-sm text-muted-foreground">
                Thử thay đổi bộ lọc hoặc khoảng thời gian.
              </p>
            </div>
          ) : (
            rows.map((notification) => (
              <article
                key={notification.id}
                className={`flex items-start gap-3 border-b p-4 last:border-b-0 ${
                  notification.read ? "" : "bg-primary/[0.035]"
                }`}
              >
                <span
                  aria-label={notification.tone}
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${toneClass(notification.tone)}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-medium">{notification.title}</h2>
                    {!notification.read ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        Chưa đọc
                      </span>
                    ) : null}
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {notification.module}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.description}</p>
                  <time
                    className="mt-2 block text-xs text-muted-foreground"
                    dateTime={notification.createdAt}
                  >
                    {new Date(notification.createdAt).toLocaleString("vi-VN")}
                  </time>
                </div>
                {notification.route ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => openNotification(notification)}
                  >
                    <ExternalLink className="mr-1.5 h-4 w-4" /> Mở
                  </Button>
                ) : null}
              </article>
            ))
          )}
        </section>

        {pageCount > 1 ? (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Trang {page} / {pageCount} · {total} thông báo
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pageCount}
                onClick={() => setPage(page + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        ) : null}
      </PageContainer>
    </AppShell>
  );
}

function matchesFilters(
  notification: AppNotification,
  filters: { module?: string; tone?: NotificationTone; read?: boolean; from?: string; to?: string },
) {
  const time = Date.parse(notification.createdAt);
  return (
    (!filters.module || notification.module === filters.module) &&
    (!filters.tone || notification.tone === filters.tone) &&
    (filters.read === undefined || notification.read === filters.read) &&
    (!filters.from || time >= Date.parse(filters.from)) &&
    (!filters.to || time <= Date.parse(filters.to))
  );
}

function toneClass(tone: NotificationTone) {
  if (tone === "success") return "bg-emerald-500";
  if (tone === "warning") return "bg-amber-500";
  if (tone === "error") return "bg-red-500";
  return "bg-blue-500";
}
