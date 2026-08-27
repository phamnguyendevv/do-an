import type { User } from "@/types";
import { clearTokens, getAuthToken, setTokens } from "@/lib/api-client";

export interface Credentials {
  email: string;
  password: string;
}

/** Demo accounts for UI convenience */
export const demoAccounts = [
  { email: "admin@example.com", password: "admin123", role: "ADMIN" as const },
  { email: "staff@example.com", password: "staff123", role: "STAFF" as const },
  { email: "user@gmail.com", password: "password123", role: "STAFF" as const },
];

const STORAGE_KEY = "bookstock.auth";

let current: User | null = null;
let hydrated = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
const API_PREFIX = import.meta.env.VITE_API_PREFIX || "/api/v1";

export const authStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => current,
  isHydrated: () => hydrated,
  hydrate() {
    if (hydrated) return;
    hydrated = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      current = raw ? (JSON.parse(raw) as User) : null;
    } catch {
      current = null;
    }
    emit();
  },
  async login({ email, password }: Credentials): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}${API_PREFIX}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { ok: false, error: body?.error?.message || body?.message || "Đăng nhập thất bại." };
      }
      const body = await res.json();
      const payload = body?.data ?? null; // ResponseInterceptor wraps controller result in { data: <presenter>, ... }
      const user = payload?.data ?? null;
      const token = payload?.token ?? null;
      if (!user || !token?.accessToken) return { ok: false, error: "Định dạng phản hồi không hợp lệ." };

      const normalizeRole = (r: any) => {
        if (typeof r === "number" || /^(\d+)$/i.test(String(r))) {
          const n = Number(r);
          return n === 1 ? "ADMIN" : "STAFF";
        }
        const s = String(r || "").toLowerCase();
        if (s.includes("admin")) return "ADMIN";
        if (s.includes("staff") || s.includes("user") || s.includes("client") || s.includes("provider")) return "STAFF";
        return "STAFF";
      };

      const isActive = user.status === 1 || user.active === true;
      if (!isActive) {
        return {
          ok: false,
          error: "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Quản trị viên!",
        };
      }

      current = {
        id: String(user.id ?? user._id ?? user.email),
        name: user.name ?? user.username ?? "",
        email: user.email,
        role: normalizeRole(user.role) as any,
        active: true,
        lastLogin: user.lastLogin ?? new Date().toISOString(),
      } as User;

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        setTokens(token.accessToken, token.refreshToken);
      } catch {
        /* ignore */
      }
      emit();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Không thể kết nối tới server." };
    }
  },
  async verifySession(): Promise<boolean> {
    if (typeof window === "undefined") return true;
    const token = getAuthToken();
    if (!token || !current) return false;

    try {
      const res = await fetch(`${API_BASE}${API_PREFIX}/users/profile`, {
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          const body = await res.json().catch(() => ({}));
          const msg = body?.error?.message || body?.message || "";
          const isDeactivated = msg.includes("vô hiệu hóa") || msg.includes("not active");
          authStore.handleUnauthorized(isDeactivated);
          return false;
        }
        return true;
      }

      const body = await res.json();
      const payload = body?.data ?? body;
      if (payload && (payload.status === 2 || payload.status === 3 || payload.status === 0 || payload.active === false)) {
        authStore.handleUnauthorized(true);
        return false;
      }
      return true;
    } catch {
      return true;
    }
  },
  handleUnauthorized(isDeactivated = false) {
    authStore.logout();
    if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
      window.location.href = isDeactivated ? "/login?disabled=1" : "/login";
    }
  },
  updateCurrentUser(partial: Partial<User>) {
    if (!current) return;
    current = { ...current, ...partial };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      /* ignore */
    }
    emit();
  },
  logout() {
    current = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
      clearTokens();
    } catch {
      /* ignore */
    }
    emit();
  },
};
