import { beforeEach, describe, expect, it } from "vitest";
import {
  ACCESS_TOKEN_KEY,
  clearTokens,
  getAuthToken,
  getRefreshToken,
  REFRESH_TOKEN_KEY,
  setTokens,
} from "./api-client";

describe("api-client token management", () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    const mockLocalStorage = {
      getItem: (key: string) => mockStore[key] ?? null,
      setItem: (key: string, val: string) => {
        mockStore[key] = String(val);
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      clear: () => {
        mockStore = {};
      },
    };

    (globalThis as any).window = globalThis;
    (globalThis as any).localStorage = mockLocalStorage;
  });

  it("should set and retrieve access and refresh tokens", () => {
    setTokens("access_token_123", "refresh_token_456");
    expect(getAuthToken()).toBe("access_token_123");
    expect(getRefreshToken()).toBe("refresh_token_456");
    expect(mockStore[ACCESS_TOKEN_KEY]).toBe("access_token_123");
    expect(mockStore[REFRESH_TOKEN_KEY]).toBe("refresh_token_456");
  });

  it("should update only access token when refresh token is omitted", () => {
    setTokens("old_access", "existing_refresh");
    setTokens("new_access");
    expect(getAuthToken()).toBe("new_access");
    expect(getRefreshToken()).toBe("existing_refresh");
  });

  it("should clear tokens properly", () => {
    setTokens("access_123", "refresh_123");
    clearTokens();
    expect(getAuthToken()).toBe("");
    expect(getRefreshToken()).toBe("");
    expect(mockStore[ACCESS_TOKEN_KEY]).toBeUndefined();
    expect(mockStore[REFRESH_TOKEN_KEY]).toBeUndefined();
  });
});
