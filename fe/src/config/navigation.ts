import {
  LayoutDashboard,
  Store,
  BookOpen,
  FolderTree,
  Building2,
  Warehouse,
  ShoppingCart,
  Truck,
  BarChart3,
  Users,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { AppAction, AppSubject } from "@/lib/ability";

export type Role = "ADMIN" | "STAFF";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
  ability?: {
    action: AppAction;
    subject: AppSubject;
  };
  /** Route not implemented yet — rendered as non-clickable */
  disabled?: boolean;
}

export const mainNav: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    ability: { action: "read", subject: "BookstoreOrder" },
  },
  {
    href: "/pos",
    label: "Bán tại quầy (POS)",
    icon: Store,
    ability: { action: "create", subject: "BookstoreOrder" },
  },
  {
    href: "/books",
    label: "Sách",
    icon: BookOpen,
    ability: { action: "read", subject: "Book" },
  },
  {
    href: "/categories",
    label: "Danh mục",
    icon: FolderTree,
    ability: { action: "read", subject: "Category" },
  },
  {
    href: "/suppliers",
    label: "Nhà cung cấp",
    icon: Building2,
    ability: { action: "read", subject: "Supplier" },
  },
  {
    href: "/inventory",
    label: "Kho hàng",
    icon: Warehouse,
    ability: { action: "read", subject: "StockMovement" },
  },
  {
    href: "/orders",
    label: "Đơn hàng",
    icon: ShoppingCart,
    ability: { action: "read", subject: "BookstoreOrder" },
  },
  {
    href: "/shipping",
    label: "Vận chuyển",
    icon: Truck,
    ability: { action: "read", subject: "Shipping" },
  },
  {
    href: "/analytics",
    label: "Thống kê",
    icon: BarChart3,
    ability: { action: "read", subject: "Revenue" },
  },
  {
    href: "/assistant",
    label: "Trợ lý AI",
    icon: Sparkles,
    ability: { action: "read", subject: "Book" },
  },
  {
    href: "/users",
    label: "Người dùng",
    icon: Users,
    ability: { action: "search", subject: "User" },
  },
];

export const footerNav: NavItem[] = [
  {
    href: "/settings",
    label: "Cài đặt",
    icon: Settings,
    ability: { action: "read", subject: "User" },
  },
];
