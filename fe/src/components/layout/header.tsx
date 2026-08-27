import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, LogOut, Menu, User as UserIcon } from "lucide-react";
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
        <Button variant="ghost" size="icon" aria-label="Thông báo" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
        </Button>

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
