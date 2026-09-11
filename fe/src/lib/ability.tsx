import { createContext, useContext, type ReactNode } from "react";
import { AbilityBuilder, createMongoAbility, type MongoAbility } from "@casl/ability";
import type { User } from "@/types";

export type AppAction =
  "manage" | "create" | "read" | "update" | "delete" | "search" | "approve" | "reject";

export type AppSubject =
  | "all"
  | "Book"
  | "Category"
  | "Supplier"
  | "BookstoreOrder"
  | "ImportReceipt"
  | "ExportReceipt"
  | "StockMovement"
  | "Revenue"
  | "User"
  | "Notification"
  | "Payment"
  | "Shipping"
  | "Customer"
  | "Promotion"
  | "ActivityLog";

export type AppAbility = MongoAbility<[AppAction, AppSubject]>;

export function defineAbilityFor(user: User | null): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (!user || !user.active) {
    return build();
  }

  const role = String(user.role).toUpperCase();

  if (role === "ADMIN") {
    // Admin has full access to all resources
    can("manage", "all");
  } else if (role === "STAFF") {
    // Staff has access to operational resources: POS, books, categories, suppliers, orders, inventory, notifications, shipping
    can(["read", "create", "update"], "Book");
    can(["read", "create", "update"], "Category");
    can(["read", "create", "update"], "Supplier");
    can(["read", "create", "update"], "Customer");
    can(["read", "create", "update"], "Promotion");
    can("read", "ActivityLog");
    can(["read", "create", "update", "delete"], "BookstoreOrder");
    can(["read", "create", "update"], "ImportReceipt");
    can(["read", "create", "update"], "ExportReceipt");
    can(["read", "create", "update"], "StockMovement");
    can(["read", "create", "update"], "Payment");
    can(["read", "create", "update"], "Shipping");
    can(["read", "update"], "Notification");
    can(["read", "update"], "User");

    // Explicit prohibitions for Staff
    cannot("update", "User", ["role", "status"]);
    cannot("delete", "User");
    cannot("search", "User");
    cannot("create", "User");
    cannot("delete", "Book");
    cannot("delete", "Category");
    cannot("delete", "Supplier");
    cannot("read", "Revenue");
  } else {
    // Client / Customer / Default
    can("read", "Book");
    can("read", "Category");
    can(["read", "create"], "BookstoreOrder");
    can(["read", "update"], "User");
    cannot("update", "User", ["role", "status"]);
    cannot("delete", "User");
    can(["read", "update"], "Notification");
  }

  return build();
}

export const AbilityContext = createContext<AppAbility>(defineAbilityFor(null));

export function useAbility(): AppAbility {
  return useContext(AbilityContext);
}

export interface CanProps {
  I?: AppAction;
  do?: AppAction;
  a?: AppSubject;
  on?: AppSubject;
  this?: Record<string, unknown>;
  field?: string;
  ability?: AppAbility;
  children: ReactNode | ((can: boolean) => ReactNode);
  fallback?: ReactNode;
}

export function Can({
  I,
  do: doAction,
  a,
  on: onSubject,
  this: thisObj,
  field,
  ability: propAbility,
  children,
  fallback = null,
}: CanProps) {
  const contextAbility = useAbility();
  const ability = propAbility || contextAbility;
  const action = I || doAction;
  const subject = (thisObj as any) || a || onSubject;

  if (!action || !subject) {
    return <>{typeof children === "function" ? children(false) : fallback}</>;
  }

  const allowed = ability.can(action, subject, field);

  if (typeof children === "function") {
    return <>{children(allowed)}</>;
  }

  return allowed ? <>{children}</> : <>{fallback}</>;
}
