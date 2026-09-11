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
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
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
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

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
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
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

        const payload = refreshResponse.data?.data ?? refreshResponse.data;
        const newAccessToken = payload?.accessToken;
        const newRefreshToken = payload?.refreshToken || refreshToken;

        if (!newAccessToken) {
          throw new Error("Không nhận được token mới");
        }

        setTokens(newAccessToken, newRefreshToken);
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearTokens();
        authStore.handleUnauthorized(false);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    const errorMsg =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      "Yêu cầu thất bại";

    return Promise.reject(new Error(errorMsg));
  },
);

/**
 * Universal wrapper for API calls that supports both Axios options and fetch RequestInit
 */
export async function apiRequest<T>(
  path: string,
  options: (AxiosRequestConfig & { method?: string; body?: any }) | RequestInit = {},
): Promise<T> {
  const method = (options.method || "GET").toLowerCase();

  let data: any = undefined;
  if ("data" in options && options.data !== undefined) {
    data = options.data;
  } else if ("body" in options && options.body !== undefined) {
    data = typeof options.body === "string" ? JSON.parse(options.body) : options.body;
  }

  const config: AxiosRequestConfig = {
    url: path,
    method,
    data,
    headers: (options.headers as any) || {},
  };

  if ("params" in options && options.params) {
    config.params = options.params;
  }

  return apiClient.request<any, T>(config);
}
