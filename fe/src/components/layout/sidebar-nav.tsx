import { Link, useRouterState } from "@tanstack/react-router";
import { BookMarked, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { mainNav, footerNav, type NavItem, type Role } from "@/config/navigation";
import { useAbility } from "@/lib/ability";

interface SidebarNavProps {
  collapsed: boolean;
  onToggleCollapsed?: () => void;
  role?: Role;
  onNavigate?: () => void;
}

function NavLink({
  item,
  collapsed,
  active,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const base = cn(
    "flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
    collapsed && "justify-center px-0",
    active
      ? "bg-sidebar-accent text-sidebar-accent-foreground"
      : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
    item.disabled && "cursor-not-allowed opacity-45 hover:bg-transparent",
  );

  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </>
  );

  const node = item.disabled ? (
    <span className={base} aria-disabled="true">
      {content}
    </span>
  ) : (
    <Link to={item.href} className={base} onClick={onNavigate}>
      {content}
    </Link>
  );

  if (!collapsed) return node;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{node}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function SidebarNav({ collapsed, onToggleCollapsed, role = "ADMIN", onNavigate }: SidebarNavProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const ability = useAbility();

  const visible = (items: NavItem[]) =>
    items.filter((i) => {
      if (i.ability) {
        return ability.can(i.ability.action, i.ability.subject);
      }
      if (i.roles) {
        return i.roles.includes(role);
      }
      return true;
    });

  return (
    <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar">
      <div
        className={cn(
          "flex h-14 items-center gap-2 border-b border-sidebar-border px-4",
          collapsed && "justify-center px-0",
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <BookMarked className="h-4 w-4" />
        </span>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">BookStock</p>
            <p className="truncate text-[11px] text-muted-foreground">Warehouse Admin</p>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {visible(mainNav).map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            active={pathname === item.href}
            {...(onNavigate ? { onNavigate } : {})}
          />
        ))}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border p-2">
        {visible(footerNav).map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            active={pathname === item.href}
            {...(onNavigate ? { onNavigate } : {})}
          />
        ))}
        {onToggleCollapsed ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapsed}
            className={cn("w-full justify-start gap-3 text-muted-foreground", collapsed && "justify-center px-0")}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>Thu gọn</span>
              </>
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
