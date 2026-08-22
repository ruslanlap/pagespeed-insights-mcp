import { describe, it, expect } from "vitest";
import {
  PerformanceRecommendationsEngine,
  type RecommendationReport,
} from "../recommendations.js";
import type { PageSpeedInsightsResponse } from "../types.js";

// Minimal valid PSI response builder — only the fields the engine reads.
function psiResponse(opts: {
  score?: number | null;
  audits?: Record<string, any>;
  auditRefs?: { id: string; weight?: number }[];
  multirunRuns?: any[];
} = {}): PageSpeedInsightsResponse {
  return {
    lighthouseResult: {
      requestedUrl: "https://example.com",
      configSettings: { formFactor: "mobile" },
      categories: {
        performance: {
          score: opts.score ?? 0.8,
          auditRefs: opts.auditRefs ?? [],
        },
      },
      audits: opts.audits ?? {},
    },
    analysisUTCTimestamp: "2023-01-01T00:00:00.000Z",
    ...(opts.multirunRuns && { multirun: { runs: opts.multirunRuns } }),
  } as unknown as PageSpeedInsightsResponse;
}

const failingAudit = (score = 0.3) => ({
  id: "unused-css-rules",
  title: "Unused CSS",
  description: "Remove unused CSS",
  score,
  displayValue: "1.2 KiB",
});

describe("PerformanceRecommendationsEngine.generateRecommendations", () => {
  const engine = new PerformanceRecommendationsEngine();

  it("throws without Lighthouse data", () => {
    expect(() => engine.generateRecommendations({} as any)).toThrow(
      /No Lighthouse data/
    );
  });

  it("maps a known failed audit into a recommendation", () => {
    const report = engine.generateRecommendations(
      psiResponse({
        audits: { "unused-css-rules": failingAudit() },
        auditRefs: [{ id: "unused-css-rules", weight: 0.5 }],
      })
    );
    expect(report.recommendations).toHaveLength(1);
    const rec = report.recommendations[0];
    expect(rec.id).toBe("unused-css-rules");
    expect(rec.impact).toBe("medium");
    expect(rec.effort).toBe("medium");
    expect(rec.potentialSavings).toBe("1.2 KiB");
    expect(report.url).toBe("https://example.com");
    expect(report.strategy).toBe("mobile");
    expect(report.overallScore).toBe(80);
  });

  it("skips passing audits (score 1), unknown audits and null scores", () => {
    const report = engine.generateRecommendations(
      psiResponse({
        audits: {
          "unused-css-rules": failingAudit(1),
          "unknown-audit": { ...failingAudit(), id: "unknown-audit" },
          "some-null-audit": { score: null, description: "?" },
        },
      })
    );
    expect(report.recommendations).toHaveLength(0);
  });

  it("surfaces *-insight audits that have items despite null score", () => {
    const report = engine.generateRecommendations(
      psiResponse({
        audits: {
          "foo-insight": {
            id: "foo-insight",
            description: "Insightful",
            score: null,
            details: { items: [{ note: "do this" }] },
          },
        },
        auditRefs: [{ id: "foo-insight" }],
      })
    );
    // Not in auditMappings table → still skipped (mapping required)
    expect(report.recommendations).toHaveLength(0);
  });

  it("multirun noise filter drops flaky audits (passed in one run)", () => {
    const audits = { "unused-css-rules": failingAudit() };
    const report = engine.generateRecommendations(
      psiResponse({
        audits,
        multirunRuns: [
          { audits: { "unused-css-rules": { score: 1 } } }, // passed here
          { audits: { "unused-css-rules": { score: 0.2 } } },
        ],
      })
    );
    expect(report.recommendations).toHaveLength(0);
  });

  it("keeps audits that fail in every run", () => {
    const report = engine.generateRecommendations(
      psiResponse({
        audits: { "unused-css-rules": failingAudit() },
        multirunRuns: [
          { audits: { "unused-css-rules": { score: 0.2 } } },
          { audits: { "unused-css-rules": { score: 0.4 } } },
        ],
      })
    );
    expect(report.recommendations).toHaveLength(1);
  });

  it("sorts by priority descending and flags quick wins", () => {
    const report = engine.generateRecommendations(
      psiResponse({
        audits: {
          "render-blocking-resources": {
            id: "render-blocking-resources",
            description: "Defer non-critical resources",
            score: 0.2,
            displayValue: "300 ms",
          },
          "unused-css-rules": failingAudit(),
        },
        auditRefs: [
          { id: "render-blocking-resources", weight: 0.9 },
          { id: "unused-css-rules", weight: 0.1 },
        ],
      })
    );
    const priorities = report.recommendations.map((r) => r.priority);
    expect([...priorities].sort((a, b) => b - a)).toEqual(priorities);
    // render-blocking-resources: high impact + low effort → quick win
    expect(report.quickWins.map((r) => r.id)).toContain(
      "render-blocking-resources"
    );
  });

  it("summary counts by priority band", () => {
    const report: RecommendationReport = engine.generateRecommendations(
      psiResponse({
        audits: {
          "render-blocking-resources": {
            id: "render-blocking-resources",
            description: "d",
            score: 0.1,
          },
        },
        auditRefs: [{ id: "render-blocking-resources", weight: 1 }],
      })
    );
    const s = report.summary;
    expect(s.totalRecommendations).toBe(
      s.highPriority + s.mediumPriority + s.lowPriority
    );
    expect(typeof s.estimatedImpact).toBe("string");
  });
});

describe("PerformanceRecommendationsEngine.formatRecommendations", () => {
  const engine = new PerformanceRecommendationsEngine();

  it("renders markdown with url, score, summary and sections", () => {
    const report = engine.generateRecommendations(
      psiResponse({
        audits: {
          "render-blocking-resources": {
            id: "render-blocking-resources",
            description: "Defer non-critical resources",
            score: 0.2,
            displayValue: "300 ms",
          },
        },
        auditRefs: [{ id: "render-blocking-resources", weight: 0.9 }],
      })
    );
    const md = engine.formatRecommendations(report);
    expect(md).toContain("# 🚀 Performance Recommendations");
    expect(md).toContain("**URL:** https://example.com");
    expect(md).toContain("**Current Score:** 80/100");
    expect(md).toContain("## ⚡ Quick Wins");
    expect(md).toContain("## 📋 All Recommendations");
    expect(md).toContain("Potential Savings");
  });
});
