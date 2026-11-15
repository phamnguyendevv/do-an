import { describe, expect, it } from "vitest";
import { normalizeApiBase, normalizeApiPrefix } from "./api-config";

describe("api-config", () => {
  describe("normalizeApiBase", () => {
    it("should prepend https:// if protocol is missing for domain", () => {
      expect(normalizeApiBase("api.zymail.site")).toBe("https://api.zymail.site");
      expect(normalizeApiBase("api.zymail.site/")).toBe("https://api.zymail.site");
    });

    it("should preserve https:// and http://", () => {
      expect(normalizeApiBase("https://api.zymail.site")).toBe("https://api.zymail.site");
      expect(normalizeApiBase("http://api.zymail.site")).toBe("http://api.zymail.site");
      expect(normalizeApiBase("https://api.zymail.site/")).toBe("https://api.zymail.site");
    });

    it("should handle localhost properly with http://", () => {
      expect(normalizeApiBase("localhost:3000")).toBe("http://localhost:3000");
      expect(normalizeApiBase("http://localhost:3000")).toBe("http://localhost:3000");
      expect(normalizeApiBase("127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
    });

    it("should fallback to default on empty/invalid", () => {
      expect(normalizeApiBase("")).toBe("http://localhost:3000");
      expect(normalizeApiBase(undefined)).toBe("http://localhost:3000");
      expect(normalizeApiBase("   ")).toBe("http://localhost:3000");
    });

    it("should handle protocol-relative URLs", () => {
      expect(normalizeApiBase("//api.zymail.site")).toBe("https://api.zymail.site");
    });
  });

  describe("normalizeApiPrefix", () => {
    it("should ensure leading slash and remove trailing slash", () => {
      expect(normalizeApiPrefix("api/v1")).toBe("/api/v1");
      expect(normalizeApiPrefix("/api/v1/")).toBe("/api/v1");
      expect(normalizeApiPrefix("")).toBe("/api/v1");
    });
  });
});
