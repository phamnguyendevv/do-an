import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck, LogOut, Menu, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchInput } from "@/components/shared/search-input";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useNotifications, useUnreadNotificationCount } from "@/hooks/use-store";
import { notificationService } from "@/services/notification-service";

export interface Crumb {
  label: string;
  href?: string;
}

interface HeaderProps {
  crumbs?: Crumb[];
  onOpenMobileNav?: () => void;
  user?: { name: string; role: string };
  onLogout?: () => void;
}

export function Header({
  crumbs = [],
  onOpenMobileNav,
  user = { name: "Nguyễn Minh", role: "ADMIN" },
  onLogout,
}: HeaderProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const notifications = useNotifications();
  const unreadCount = useUnreadNotificationCount();

  useEffect(() => {
    notificationService.refreshFromApi();
    return notificationService.connectRealtime();
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMobileNav}
        aria-label="Mở menu"
      >
        <Menu className="h-4 w-4" />
      </Button>

      <Breadcrumb className="hidden min-w-0 sm:block">
        <BreadcrumbList>
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="contents">
              <BreadcrumbItem>
                {c.href && i < crumbs.length - 1 ? (
                  <BreadcrumbLink href={c.href}>{c.label}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{c.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {i < crumbs.length - 1 ? <BreadcrumbSeparator /> : null}
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1.5">
        <SearchInput
          className="hidden w-56 md:block"
          placeholder="Tìm sách theo tên, tác giả..."
          value={query}
          onValueChange={setQuery}
          onSubmit={(v) => {
            const q = v.trim();
            navigate({ to: "/books", search: q ? { q } : {} });
          }}
        />
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Thông báo" className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[360px] p-0">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="font-semibold text-foreground">Thông báo hệ thống</span>
              {unreadCount > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => notificationService.markAllRead()}
                >
                  <CheckCheck className="mr-1 h-3.5 w-3.5" /> Đọc hết
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => navigate({ to: "/notifications" })}
              >
                Xem lịch sử
              </Button>
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Chưa có thông báo nào.
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    className={`block w-full border-b px-3 py-3 text-left transition-colors last:border-0 hover:bg-accent/50 ${
                      notification.read ? "opacity-80" : "bg-muted/30"
                    }`}
                    onClick={() => {
                      notificationService.markRead(notification.id);
                      if (notification.route) navigate({ to: notification.route as never });
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-1 h-2.5 w-2.5 rounded-full ${
                          notification.tone === "success"
                            ? "bg-emerald-500"
                            : notification.tone === "warning"
                              ? "bg-amber-500"
                              : notification.tone === "error"
                                ? "bg-red-500"
                                : "bg-blue-500"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {notification.title}
                          </span>
                          {!notification.read ? (
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{notification.module}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-foreground/80">
                          {notification.description}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {notifications.length > 0 ? (
              <div className="border-t p-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center text-xs"
                  onClick={() => navigate({ to: "/notifications" })}
                >
                  Mở trung tâm thông báo
                </Button>
              </div>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  {user.name.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-sm font-medium">{user.name}</span>
                <span className="block text-[11px] text-muted-foreground">{user.role}</span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate({ to: "/profile" })}>
              <UserIcon className="mr-2 h-4 w-4" /> Hồ sơ
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onLogout?.()}>
              <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
