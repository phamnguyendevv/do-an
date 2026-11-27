/**
 * Chuẩn hóa base URL của Backend API:
 * - Tự động thêm protocol https:// (hoặc http:// với localhost) nếu người dùng nhập domain không có protocol (vd: api.zymail.site -> https://api.zymail.site).
 * - Loại bỏ dấu gạch chéo cuối cùng (trailing slash) để tránh URL bị //api/v1.
 */
export function normalizeApiBase(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== "string") {
    return "http://localhost:3000";
  }
  let url = rawUrl.trim();
  if (!url) return "http://localhost:3000";

  // Nếu người dùng nhập //api.example.com
  if (url.startsWith("//")) {
    url = `https:${url}`;
  } else if (!/^https?:\/\//i.test(url)) {
    // Không có http:// hoặc https://
    if (url.startsWith("localhost") || url.startsWith("127.0.0.1")) {
      url = `http://${url}`;
    } else {
      url = `https://${url}`;
    }
  }

  return url.replace(/\/+$/, "");
}

/**
 * Chuẩn hóa prefix URL của API (mặc định là /api/v1)
 */
export function normalizeApiPrefix(rawPrefix?: string): string {
  if (!rawPrefix || typeof rawPrefix !== "string") {
    return "/api/v1";
  }
  let prefix = rawPrefix.trim();
  if (!prefix) return "/api/v1";
  if (!prefix.startsWith("/")) {
    prefix = `/${prefix}`;
  }
  return prefix.replace(/\/+$/, "");
}

export const API_BASE = normalizeApiBase(import.meta.env["VITE_API_BASE"]);
export const API_PREFIX = normalizeApiPrefix(import.meta.env["VITE_API_PREFIX"]);
