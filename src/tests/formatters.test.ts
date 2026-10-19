import { describe, it, expect } from "vitest";
import {
  getScoreRating,
  renderScoreBar,
  renderShieldBadge,
  evaluateMetric,
  renderCwvTable,
} from "../formatters.js";

describe("formatters", () => {
  describe("getScoreRating", () => {
    it("handles null or NaN scores", () => {
      expect(getScoreRating(null)).toEqual({
        emoji: "❓",
        label: "Unavailable",
        color: "inactive",
        hex: "#64748B",
      });
      expect(getScoreRating(NaN)).toEqual({
        emoji: "❓",
        label: "Unavailable",
        color: "inactive",
        hex: "#64748B",
      });
    });

    it("evaluates scores 90-100 as Good", () => {
      expect(getScoreRating(100)).toEqual({
        emoji: "🟢",
        label: "Good",
        color: "success",
        hex: "#10B981",
      });
      expect(getScoreRating(90)).toEqual({
        emoji: "🟢",
        label: "Good",
        color: "success",
        hex: "#10B981",
      });
    });

    it("evaluates scores 50-89 as Needs Improvement", () => {
      expect(getScoreRating(89)).toEqual({
        emoji: "🟠",
        label: "Needs Improvement",
        color: "orange",
        hex: "#F59E0B",
      });
      expect(getScoreRating(50)).toEqual({
        emoji: "🟠",
        label: "Needs Improvement",
        color: "orange",
        hex: "#F59E0B",
      });
    });

    it("evaluates scores below 50 as Poor", () => {
      expect(getScoreRating(49)).toEqual({
        emoji: "🔴",
        label: "Poor",
        color: "critical",
        hex: "#EF4444",
      });
      expect(getScoreRating(0)).toEqual({
        emoji: "🔴",
        label: "Poor",
        color: "critical",
        hex: "#EF4444",
      });
    });
  });

  describe("renderScoreBar", () => {
    it("renders empty bar for null or NaN scores", () => {
      expect(renderScoreBar(null, 10)).toBe("░░░░░░░░░░");
      expect(renderScoreBar(NaN, 5)).toBe("░░░░░");
    });

    it("renders filled bar for 100", () => {
      expect(renderScoreBar(100, 10)).toBe("██████████");
    });

    it("renders partially filled bar", () => {
      expect(renderScoreBar(50, 10)).toBe("█████░░░░░");
    });

    it("clamps values outside 0-100", () => {
      expect(renderScoreBar(-10, 10)).toBe("░░░░░░░░░░");
      expect(renderScoreBar(150, 10)).toBe("██████████");
    });
  });

  describe("renderShieldBadge", () => {
    it("generates markdown badge with encoded URL and score", () => {
      const badge = renderShieldBadge(95, "https://example.com/test?a=1");
      expect(badge).toContain("https://img.shields.io/badge/PageSpeed-95%2F100-success");
      expect(badge).toContain("https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fexample.com%2Ftest%3Fa%3D1");
    });

    it("generates badge for null score", () => {
      const badge = renderShieldBadge(null, "https://example.com");
      expect(badge).toContain("PageSpeed-N%2FA-inactive");
    });
  });

  describe("evaluateMetric", () => {
    it("handles undefined or NaN values", () => {
      expect(evaluateMetric("largest-contentful-paint", undefined)).toEqual({
        status: "unknown",
        badge: "⚪ Unknown",
      });
      expect(evaluateMetric("largest-contentful-paint", NaN)).toEqual({
        status: "unknown",
        badge: "⚪ Unknown",
      });
    });

    it("handles unknown metric IDs", () => {
      expect(evaluateMetric("unknown-metric", 100)).toEqual({
        status: "unknown",
        badge: "⚪ Neutral",
      });
    });

    it("evaluates metric thresholds accurately (LCP)", () => {
      expect(evaluateMetric("largest-contentful-paint", 2000)).toEqual({
        status: "good",
        badge: "🟢 Good",
      });
      expect(evaluateMetric("largest-contentful-paint", 3000)).toEqual({
        status: "mediocre",
        badge: "🟡 Needs Improvement",
      });
      expect(evaluateMetric("largest-contentful-paint", 5000)).toEqual({
        status: "poor",
        badge: "🔴 Poor",
      });
    });

    it("evaluates CLS decimal thresholds", () => {
      expect(evaluateMetric("cumulative-layout-shift", 0.05)).toEqual({
        status: "good",
        badge: "🟢 Good",
      });
      expect(evaluateMetric("cumulative-layout-shift", 0.15)).toEqual({
        status: "mediocre",
        badge: "🟡 Needs Improvement",
      });
      expect(evaluateMetric("cumulative-layout-shift", 0.35)).toEqual({
        status: "poor",
        badge: "🔴 Poor",
      });
    });
  });

  describe("renderCwvTable", () => {
    it("generates markdown table from metric array", () => {
      const table = renderCwvTable([
        {
          name: "Largest Contentful Paint",
          id: "largest-contentful-paint",
          display: "2.1 s",
          value: 2100,
          target: "≤ 2.5 s",
        },
      ]);

      expect(table).toContain("| Core Web Vital | Lab Value | Status | Target Threshold |");
      expect(table).toContain("| **Largest Contentful Paint** | `2.1 s` | 🟢 Good | `≤ 2.5 s` |");
    });
  });
});
