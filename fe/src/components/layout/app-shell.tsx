import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Header, type Crumb } from "@/components/layout/header";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { useAuth } from "@/hooks/use-auth";
import { authStore } from "@/services/auth-service";
import type { Role } from "@/config/navigation";
import { AbilityContext, defineAbilityFor, type AppAction, type AppSubject } from "@/lib/ability";

interface AppShellProps {
  children: ReactNode;
  crumbs?: Crumb[];
  /** Restrict the page to a specific CASL ability action + subject */
  requiredAbility?: {
    action: AppAction;
    subject: AppSubject;
  };
  /** Restrict the page to a single role (legacy/convenience guard) */
  requiredRole?: Role;
}

export function AppShell({ children, crumbs, requiredAbility, requiredRole }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { user, hydrated, logout } = useAuth();

  const ability = useMemo(() => defineAbilityFor(user), [user]);

  useEffect(() => {
    if (hydrated && !user) {
      navigate({ to: "/login", replace: true });
      return;
    }

    if (hydrated && user) {
      // Immediate verification on page load
      authStore.verifySession();

      // Check every 5 seconds so deactivated accounts are kicked out immediately
      const interval = setInterval(() => {
        authStore.verifySession();
      }, 5000);

      const handleFocus = () => {
        authStore.verifySession();
      };
      window.addEventListener("focus", handleFocus);

      return () => {
        clearInterval(interval);
        window.removeEventListener("focus", handleFocus);
      };
    }
  }, [hydrated, user, navigate]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <LoadingState />
      </div>
    );
  }

  let denied = false;
  if (requiredAbility) {
    denied = !ability.can(requiredAbility.action, requiredAbility.subject);
  } else if (requiredRole) {
    denied = user.role !== requiredRole;
  }

  return (
    <AbilityContext.Provider value={ability}>
      <TooltipProvider delayDuration={200}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
        >
          Bỏ qua điều hướng
        </a>
        <div className="flex min-h-screen bg-background">
          <aside
            className={cn(
              "hidden shrink-0 transition-[width] duration-200 lg:block",
              collapsed ? "w-[64px]" : "w-[236px]",
            )}
          >
            <div className={cn("fixed inset-y-0 left-0", collapsed ? "w-[64px]" : "w-[236px]")}>
              <SidebarNav
                collapsed={collapsed}
                role={user.role}
                onToggleCollapsed={() => setCollapsed((v) => !v)}
              />
            </div>
          </aside>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="w-[260px] p-0">
              <SidebarNav collapsed={false} role={user.role} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 flex-1 flex-col">
            <Header
              {...(crumbs ? { crumbs } : {})}
              user={{ name: user.name, role: user.role }}
              onLogout={() => {
                logout();
                navigate({ to: "/login", replace: true });
              }}
              onOpenMobileNav={() => setMobileOpen(true)}
            />
            <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
              {denied ? (
                <div className="p-6">
                  <ErrorState
                    title="Không có quyền truy cập"
                    message="Tài khoản của bạn không được phép xem trang này."
                  />
                </div>
              ) : (
                children
              )}
            </main>
          </div>
        </div>
      </TooltipProvider>
    </AbilityContext.Provider>
  );
}
