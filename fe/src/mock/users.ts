import type { User } from "@/types";

export const mockUsers: User[] = [
  {
    id: "U-001",
    name: "Nguyễn Minh",
    email: "admin@example.com",
    role: "ADMIN",
    active: true,
    lastLogin: "2026-08-13T08:12:00.000Z",
  },
  {
    id: "U-002",
    name: "Trần Thanh Hà",
    email: "ha.tran@example.com",
    role: "STAFF",
    active: true,
    lastLogin: "2026-08-12T14:32:00.000Z",
  },
  {
    id: "U-003",
    name: "Lê Văn Sơn",
    email: "son.le@example.com",
    role: "STAFF",
    active: true,
    lastLogin: "2026-08-13T07:05:00.000Z",
  },
  {
    id: "U-004",
    name: "Phạm Bảo Ngọc",
    email: "ngoc.pham@example.com",
    role: "STAFF",
    active: false,
    lastLogin: "2026-07-28T10:41:00.000Z",
  },
  {
    id: "U-005",
    name: "Đặng Quốc Toàn",
    email: "toan.dang@example.com",
    role: "ADMIN",
    active: true,
    lastLogin: "2026-08-11T16:20:00.000Z",
  },
  {
    id: "U-006",
    name: "Vũ Khánh Linh",
    email: "linh.vu@example.com",
    role: "STAFF",
    active: true,
    lastLogin: "2026-08-10T09:15:00.000Z",
  },
  {
    id: "U-007",
    name: "Hoàng Anh Tuấn",
    email: "tuan.hoang@example.com",
    role: "STAFF",
    active: false,
    lastLogin: "2026-06-30T11:00:00.000Z",
  },
];

export const rolePermissions: Record<"ADMIN" | "STAFF", string[]> = {
  ADMIN: ["Sách", "Kho hàng", "Đơn hàng", "Vận chuyển", "Thống kê", "Người dùng", "Cài đặt"],
  STAFF: ["Sách", "Kho hàng", "Đơn hàng", "Vận chuyển"],
};
