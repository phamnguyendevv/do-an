export type UserApiItem = {
  id: number;
  username: string;
  email: string;
  role: number; // 1: Admin, 2: Staff, 3: Client
  status: number; // 1: Active, 2: Inactive
  phone?: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  addressProvince?: string;
  addressDistrict?: string;
  addressWard?: string;
  addressDetail?: string;
  emailVerified?: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
};

import { apiRequest } from "./api-client";
import { notificationService } from "@/services/notification-service";

export type UserListApiResponse = {
  data: UserApiItem[];
  pagination: { total: number; page: number; size: number };
};

export const userApi = {
  async list(params?: {
    search?: string;
    role?: number;
    status?: number;
    page?: number;
    size?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.search) search.set("search", params.search);
    if (params?.role !== undefined) search.set("role", String(params.role));
    if (params?.status !== undefined) search.set("status", String(params.status));
    if (params?.page) search.set("page", String(params.page));
    if (params?.size) search.set("size", String(params.size));

    const qs = search.toString();
    return apiRequest<UserListApiResponse>(`/admin/users${qs ? `?${qs}` : ""}`);
  },

  async get(id: number | string) {
    return apiRequest<UserApiItem>(`/admin/users/${id}`);
  },

  async create(payload: {
    username: string;
    email: string;
    password?: string;
    role?: number;
    phone?: string;
    status?: number;
  }) {
    const user = await apiRequest<UserApiItem>("/admin/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    notificationService.push({
      title: "Tài khoản người dùng mới",
      description: "Hệ thống vừa thêm một người dùng.",
      module: "Người dùng",
      tone: "info",
      route: "/users",
      showToast: false,
    });
    return user;
  },

  async update(id: number | string, payload: { role?: number; status?: number }) {
    const updated = await apiRequest<boolean>(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    notificationService.push({
      title: "Cập nhật tài khoản người dùng",
      description: "Vai trò hoặc trạng thái tài khoản đã thay đổi.",
      module: "Người dùng",
      tone: "info",
      route: "/users",
      showToast: false,
    });
    return updated;
  },

  async getProfile() {
    return apiRequest<UserApiItem>("/users/profile");
  },

  async updateProfile(payload: {
    username?: string;
    phone?: string;
    addressProvince?: string;
    addressDistrict?: string;
    addressWard?: string;
    addressDetail?: string;
  }) {
    return apiRequest<boolean>("/users/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async changePassword(payload: {
    oldPassword: string;
    password: string;
    confirmPassword: string;
  }) {
    return apiRequest<boolean>("/users/change-password", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async adminResetPassword(id: number | string, password: string) {
    const reset = await apiRequest<boolean>(`/admin/users/${id}/reset-password`, {
      method: "PUT",
      body: JSON.stringify({ password }),
    });
    notificationService.push({
      title: "Thông tin bảo mật tài khoản đã thay đổi",
      description: "Quản trị viên vừa đặt lại mật khẩu cho một tài khoản.",
      module: "Người dùng",
      tone: "warning",
      route: "/users",
      showToast: false,
    });
    return reset;
  },
};
