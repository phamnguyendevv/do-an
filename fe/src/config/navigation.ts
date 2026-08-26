import {
  LayoutDashboard,
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


export type Role = "ADMIN" | "STAFF";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  /** Route not implemented yet — rendered as non-clickable */
  disabled?: boolean;
}

export const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "STAFF"] },
  { href: "/books", label: "Sách", icon: BookOpen, roles: ["ADMIN", "STAFF"] },
  { href: "/categories", label: "Danh mục", icon: FolderTree, roles: ["ADMIN", "STAFF"] },
  { href: "/suppliers", label: "Nhà cung cấp", icon: Building2, roles: ["ADMIN", "STAFF"] },
  { href: "/inventory", label: "Kho hàng", icon: Warehouse, roles: ["ADMIN", "STAFF"] },
  { href: "/orders", label: "Đơn hàng", icon: ShoppingCart, roles: ["ADMIN", "STAFF"] },
  { href: "/shipping", label: "Vận chuyển", icon: Truck, roles: ["ADMIN", "STAFF"] },
  { href: "/analytics", label: "Thống kê", icon: BarChart3, roles: ["ADMIN"] },
  { href: "/assistant", label: "Trợ lý AI", icon: Sparkles, roles: ["ADMIN", "STAFF"] },
  { href: "/users", label: "Người dùng", icon: Users, roles: ["ADMIN"] },
];

export const footerNav: NavItem[] = [
  { href: "/settings", label: "Cài đặt", icon: Settings, roles: ["ADMIN"], disabled: true },
];
