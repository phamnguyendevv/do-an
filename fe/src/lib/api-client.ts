import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { authStore } from "@/services/auth-service";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
const API_PREFIX = import.meta.env.VITE_API_PREFIX || "/api/v1";

export const ACCESS_TOKEN_KEY = "bookstock.token";
export const REFRESH_TOKEN_KEY = "bookstock.refresh_token";

export function getAuthToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function getRefreshToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setTokens(accessToken: string, refreshToken?: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  } catch {
    // Ignore localStorage errors
  }
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

export const apiClient = axios.create({
  baseURL: `${API_BASE}${API_PREFIX}`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
  withCredentials: true,
});

// Request Interceptor: Attach Access Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Auto Refresh Token Queue
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    // Unwrap standard NestJS ResponseInterceptor payload ({ data: <payload>, message: ... })
    const body = response.data;
    return body?.data !== undefined ? body.data : body;
  },
  async (error: AxiosError<unknown>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean } | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const isAuthEndpoint =
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/refresh");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Queue the request until refresh completes
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (originalRequest && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return apiClient(originalRequest as InternalAxiosRequestConfig);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        isRefreshing = false;
        const msg = error.response?.data?.error?.message || error.response?.data?.message || "";
        const isDeactivated = msg.includes("vô hiệu hóa") || msg.includes("not active");
        authStore.handleUnauthorized(isDeactivated);
        return Promise.reject(error);
      }

      try {
        // Call refresh endpoint with raw axios instance to avoid interceptor loop
        const refreshResponse = await axios.post(
          `${API_BASE}${API_PREFIX}/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
              "Content-Type": "application/json",
            },
          },
        );

        const payload = (refreshResponse.data as any)?.data ?? (refreshResponse.data as any);
        const newAccessToken = payload?.accessToken as string | undefined;
        const newRefreshToken = (payload?.refreshToken as string) || refreshToken;

        if (!newAccessToken) {
          throw new Error("Không nhận được token mới");
        }

        setTokens(newAccessToken, newRefreshToken);
        processQueue(null, newAccessToken);

        if (originalRequest && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest as InternalAxiosRequestConfig);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearTokens();
        authStore.handleUnauthorized(false);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    const errorBody = (error.response?.data as any) || {};
    const errorMsg =
      errorBody?.error?.message || errorBody?.message || (error.message as string) || "Yêu cầu thất bại";

    return Promise.reject(new Error(errorMsg));
  },
);

/**
 * Universal wrapper for API calls that supports both Axios options and fetch RequestInit
 */
export async function apiRequest<T>(
  path: string,
  options: (AxiosRequestConfig & { method?: string; body?: unknown }) | RequestInit = {},
): Promise<T> {
  const method = (options.method || "GET").toLowerCase();

  let data: unknown = undefined;
  if ("data" in options && (options as any).data !== undefined) {
    data = (options as any).data;
  } else if ("body" in options && (options as any).body !== undefined) {
    const body = (options as any).body;
    data = typeof body === "string" ? JSON.parse(body) : body;
  }

  const config: AxiosRequestConfig = {
    url: path,
    method,
    data: data as any,
    headers: (options as any).headers as Record<string, string> | undefined || {},
  };

  if ("params" in options && (options as any).params) {
    config.params = (options as any).params;
  }

  return apiClient.request<unknown, T>(config as AxiosRequestConfig);
}
