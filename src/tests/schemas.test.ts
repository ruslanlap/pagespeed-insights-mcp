import { describe, it, expect } from "vitest";
import { UrlSchema, LocaleSchema, AnalyzePageSpeedSchema } from "../schemas.js";

describe("UrlSchema", () => {
  it("accepts https URLs", () => {
    expect(UrlSchema.safeParse("https://example.com").success).toBe(true);
    expect(UrlSchema.safeParse("https://example.com/some/path?q=1#frag").success).toBe(true);
  });

  it("accepts http URLs", () => {
    expect(UrlSchema.safeParse("http://example.com").success).toBe(true);
    expect(UrlSchema.safeParse("http://localhost:3000/x").success).toBe(true);
  });

  it.each([
    ["file:///etc/passwd"],
    ["ftp://example.com/x"],
    ["javascript:alert(1)"],
    ["data:text/html,<script>alert(1)</script>"],
    ["ws://example.com"],
    ["gopher://example.com"],
  ])("rejects non-http(s) scheme: %s", (url) => {
    const result = UrlSchema.safeParse(url);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("http");
    }
  });

  it("rejects malformed URLs with the underlying Zod message", () => {
    const result = UrlSchema.safeParse("not a url");
    expect(result.success).toBe(false);
  });

  it("rejects empty strings", () => {
    expect(UrlSchema.safeParse("").success).toBe(false);
  });
});

describe("LocaleSchema", () => {
  it("accepts simple language tags", () => {
    expect(LocaleSchema.safeParse("en").success).toBe(true);
    expect(LocaleSchema.safeParse("tr").success).toBe(true);
  });

  it("accepts language-region tags", () => {
    expect(LocaleSchema.safeParse("en-US").success).toBe(true);
    expect(LocaleSchema.safeParse("tr-TR").success).toBe(true);
  });

  it("rejects bad formats", () => {
    expect(LocaleSchema.safeParse("EN").success).toBe(false);
    expect(LocaleSchema.safeParse("en_US").success).toBe(false);
    expect(LocaleSchema.safeParse("english").success).toBe(false);
  });
});

describe("AnalyzePageSpeedSchema defaults", () => {
  it("fills in default strategy, category and locale when omitted", () => {
    const result = AnalyzePageSpeedSchema.safeParse({ url: "https://example.com" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.strategy).toBe("mobile");
      expect(result.data.category).toEqual(["performance"]);
      expect(result.data.locale).toBe("en");
    }
  });

  it("blocks a file:// URL even when other fields are valid", () => {
    const result = AnalyzePageSpeedSchema.safeParse({
      url: "file:///etc/passwd",
      strategy: "mobile",
    });
    expect(result.success).toBe(false);
  });
});
