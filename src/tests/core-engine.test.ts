import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { median, spread, summariseMultirun } from "../multirun.js";
import { getBaseline, saveBaseline, clearBaseline, compareBaselines } from "../baselines.js";

vi.mock("../env.js", () => ({
  validateEnv: () => {},
  getEnv: () => ({
    GOOGLE_API_KEY: "test-api-key",
    REQUEST_TIMEOUT: 30000,
    RETRY_ATTEMPTS: 2,
    CACHE_TTL: 3600,
    MAX_CONCURRENCY: 3,
    LOG_LEVEL: "silent",
    NODE_ENV: "test",
  }),
}));

import { cache } from "../cache.js";

describe("Agent Gamma: Core Engine, Math & Caching", () => {
  describe("Multirun mathematical boundary conditions", () => {
    it("median returns 0 for empty values array", () => {
      expect(median([])).toBe(0);
    });

    it("spread returns null for empty values array", () => {
      expect(spread([])).toBeNull();
    });

    it("summariseMultirun skips runs where lighthouseResult is undefined or null", () => {
      const summary = summariseMultirun([
        { lighthouseResult: undefined as any },
        {
          lighthouseResult: {
            fetchTime: "2026-01-01T00:00:00Z",
            categories: { performance: { score: 0.9 } },
            audits: { "total-blocking-time": { numericValue: 50 } },
          },
        },
      ]);

      expect(summary.stats.requested).toBe(2);
      expect(summary.stats.analyses).toBe(2);
      expect(summary.scores.performance).toEqual({ median: 90, min: 90, max: 90 });
      expect(summary.metrics["total-blocking-time"]).toEqual({ median: 50, min: 50, max: 50 });
    });

    it("summariseMultirun handles categories with null scores gracefully", () => {
      const summary = summariseMultirun([
        {
          lighthouseResult: {
            fetchTime: "2026-01-01T00:00:00Z",
            categories: { performance: { score: null } },
            audits: {},
          },
        },
      ]);

      expect(summary.stats.analyses).toBe(1);
      expect(summary.scores.performance).toBeUndefined();
    });
  });

  describe("Baselines disjoint metrics and filesystem safety", () => {
    let tempBaseDir: string;

    beforeEach(() => {
      tempBaseDir = mkdtempSync(join(tmpdir(), "psi-gamma-"));
    });

    afterEach(() => {
      delete process.env.PAGESPEED_BASELINES_DIR;
      rmSync(tempBaseDir, { recursive: true, force: true });
    });

    it("creates nested directory structure if directory does not exist when saving baseline", () => {
      const nestedDir = join(tempBaseDir, "sub1", "sub2", "sub3");
      process.env.PAGESPEED_BASELINES_DIR = nestedDir;

      expect(existsSync(nestedDir)).toBe(false);

      const saved = saveBaseline(
        "https://example.com",
        "mobile",
        {
          stats: { analyses: 1, requested: 1, cachedReplays: 0 },
          scores: { performance: { median: 80, min: 80, max: 80 } },
          metrics: { "first-contentful-paint": { median: 1200, min: 1200, max: 1200 } },
        },
        "12.0.0"
      );

      expect(existsSync(nestedDir)).toBe(true);
      expect(saved.lighthouseVersion).toBe("12.0.0");
      expect(getBaseline("https://example.com", "mobile")?.scores.performance.median).toBe(80);

      clearBaseline("https://example.com", "mobile");
      expect(getBaseline("https://example.com", "mobile")).toBeNull();
    });

    it("handles disjoint metrics and scores between snapshots without throwing", () => {
      const before = {
        recorded: "2026-01-01T00:00:00Z",
        scores: {
          performance: { median: 60, min: 55, max: 65 },
          accessibility: { median: 90, min: 85, max: 95 }, // only in before
        },
        metrics: {
          "first-contentful-paint": { median: 2000, min: 1900, max: 2100 },
          "speed-index": { median: 3000, min: 2800, max: 3200 }, // only in before
        },
      };

      const after = {
        recorded: "2026-01-02T00:00:00Z",
        scores: {
          performance: { median: 80, min: 75, max: 85 },
          seo: { median: 100, min: 100, max: 100 }, // only in after
        },
        metrics: {
          "first-contentful-paint": { median: 1200, min: 1100, max: 1300 },
          "total-blocking-time": { median: 100, min: 80, max: 120 }, // only in after
        },
      };

      const verdicts = compareBaselines(before, after);
      // Only the shared metric ('first-contentful-paint') and shared score ('performance') are compared
      expect(verdicts).toHaveLength(2);
      expect(verdicts.map((v) => v.metric).sort()).toEqual(["first-contentful-paint", "performance"]);

      const perfVerdict = verdicts.find((v) => v.metric === "performance")!;
      expect(perfVerdict.verdict).toBe("improved");
      expect(perfVerdict.guaranteedDelta).toBe(10); // 75 - 65

      const fcpVerdict = verdicts.find((v) => v.metric === "first-contentful-paint")!;
      expect(fcpVerdict.verdict).toBe("improved");
      expect(fcpVerdict.guaranteedDelta).toBe(600); // 1900 - 1300
    });
  });

  describe("Cache cleanup & lifecycle", () => {
    beforeEach(() => cache.clear());

    it("cleanup removes all stale keys when time passes", () => {
      vi.useFakeTimers();
      cache.set("key1", "val1", 500);
      cache.set("key2", "val2", 1500);
      expect(cache.size()).toBe(2);

      vi.advanceTimersByTime(600);
      cache.cleanup();
      expect(cache.size()).toBe(1);
      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBe("val2");

      vi.advanceTimersByTime(1000);
      cache.cleanup();
      expect(cache.size()).toBe(0);
      vi.useRealTimers();
    });
  });
});
