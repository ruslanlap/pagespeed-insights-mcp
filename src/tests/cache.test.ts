import { describe, it, expect, beforeEach, vi } from "vitest";
import { cache, createPSICacheKey, createCruxCacheKey } from "../cache.js";

vi.mock("../env.js", () => ({
  getEnv: () => ({
    GOOGLE_API_KEY: "test-api-key",
    REQUEST_TIMEOUT: 30000,
    RETRY_ATTEMPTS: 2,
    CACHE_TTL: 3600,
    MAX_CONCURRENCY: 3,
    LOG_LEVEL: "info",
    NODE_ENV: "test",
  }),
}));

describe("SimpleCache", () => {
  beforeEach(() => cache.clear());

  it("stores and retrieves values", () => {
    cache.set("k", { a: 1 });
    expect(cache.get("k")).toEqual({ a: 1 });
  });

  it("returns null on miss", () => {
    expect(cache.get("nope")).toBeNull();
  });

  it("expires entries after TTL and deletes them lazily", () => {
    vi.useFakeTimers();
    cache.set("k", "v", 1000);
    expect(cache.get("k")).toBe("v");
    vi.advanceTimersByTime(1001);
    expect(cache.get("k")).toBeNull(); // expired → lazy delete
    vi.useRealTimers();
  });

  it("cleanup() removes only expired entries", () => {
    vi.useFakeTimers();
    cache.set("fresh", 1, 60_000);
    cache.set("stale", 2, 1000);
    vi.advanceTimersByTime(2000);
    cache.cleanup();
    expect(cache.size()).toBe(1);
    expect(cache.get("fresh")).toBe(1);
    vi.useRealTimers();
  });

  it("size reflects entry count", () => {
    expect(cache.size()).toBe(0);
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.size()).toBe(2);
  });
});

describe("cache key builders", () => {
  it("PSI key sorts categories so order does not change identity", () => {
    const a = createPSICacheKey("https://x.com", "mobile", ["performance", "seo"], "en");
    const b = createPSICacheKey("https://x.com", "mobile", ["seo", "performance"], "en");
    expect(a).toBe(b);
  });

  it("PSI key differs by strategy/locale/url", () => {
    const base = createPSICacheKey("https://x.com", "mobile", ["performance"], "en");
    expect(createPSICacheKey("https://y.com", "mobile", ["performance"], "en")).not.toBe(base);
    expect(createPSICacheKey("https://x.com", "desktop", ["performance"], "en")).not.toBe(base);
    expect(createPSICacheKey("https://x.com", "mobile", ["performance"], "uk")).not.toBe(base);
  });

  it("CrUX key defaults formFactor", () => {
    expect(createCruxCacheKey("https://x.com")).toBe("crux:https://x.com:default");
    expect(createCruxCacheKey("https://x.com", "PHONE")).toBe("crux:https://x.com:PHONE");
  });
});
