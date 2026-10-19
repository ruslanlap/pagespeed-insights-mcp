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

  it("does not invent failures for known audits with missing scores", () => {
    const report = engine.generateRecommendations(psiResponse({ audits: {
      'unused-css-rules': { title: 'Unavailable CSS audit' },
      'image-alt': { score: null },
    } }));
    expect(report.recommendations).toEqual([]);
    expect(report.quickWins).toEqual([]);
  });

  it("keeps actionable null-score insights present in every run", () => {
    const insight = { score: null, description: 'Defer CSS', details: { items: [{ url: 'style.css' }] } };
    const report = engine.generateRecommendations(psiResponse({
      audits: { 'render-blocking-insight': insight },
      multirunRuns: [
        { lighthouseResult: { audits: { 'render-blocking-insight': insight } } },
        { audits: { 'render-blocking-insight': insight } },
      ],
    }));
    expect(report.recommendations.map(rec => rec.id)).toEqual(['render-blocking-insight']);
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

describe("PerformanceRecommendationsEngine — actionable reports", () => {
  const engine = new PerformanceRecommendationsEngine();

  it("returns the complete empty report when Lighthouse has no audits or metadata", () => {
    expect(engine.generateRecommendations({ lighthouseResult: {} } as any)).toEqual({
      url: 'Unknown', strategy: 'unknown', overallScore: 0, recommendations: [], quickWins: [],
      summary: { totalRecommendations: 0, highPriority: 0, mediumPriority: 0, lowPriority: 0, estimatedImpact: 'Low' },
    });
  });

  it("maps accessibility advice with exact actionable steps, score and savings", () => {
    const report = engine.generateRecommendations(psiResponse({ score: 0.756, audits: { 'image-alt': { score: 0, description: 'Images need alternatives', displayValue: '3 images' } } }));
    const expected = {
      id: 'image-alt', title: '🖼️ Add alt text to images', description: 'Images need alternatives', impact: 'high', effort: 'low', category: 'accessibility', priority: 100, potentialSavings: '3 images',
      howToFix: ['Add descriptive alt attributes to all images', 'Use empty alt="" for decorative images', 'Describe image content and context', 'Avoid redundant phrases like "image of"'],
      moreInfo: 'Alt text is essential for screen readers and SEO',
    };
    expect(report).toEqual({ url: 'https://example.com', strategy: 'mobile', overallScore: 76, recommendations: [expected], quickWins: [expected], summary: { totalRecommendations: 1, highPriority: 1, mediumPriority: 0, lowPriority: 0, estimatedImpact: 'Medium' } });
  });

  it("ranks real score weights before diagnostic savings and excludes low-impact quick wins", () => {
    const report = engine.generateRecommendations(psiResponse({ audits: {
      'unminified-css': { score: 0.99 },
      'third-parties-insight': { score: 0.99 },
      'unused-css-rules': { score: 0.99, displayValue: '10 MiB', details: { type: 'opportunity' } },
    }, auditRefs: [{ id: 'unminified-css', weight: 0.1 }, { id: 'third-parties-insight', weight: 0 }] }));
    expect(report.recommendations.map(({ id, priority }) => ({ id, priority }))).toEqual([
      { id: 'unminified-css', priority: 95 }, { id: 'unused-css-rules', priority: 95 }, { id: 'third-parties-insight', priority: 75 },
    ]);
    expect(report.quickWins).toEqual([]);
    expect(report.summary).toEqual({ totalRecommendations: 3, highPriority: 2, mediumPriority: 1, lowPriority: 0, estimatedImpact: 'Medium' });
  });

  it.each([
    [0.49, 4, 'Very High'], [0.5, 4, 'High'], [0.69, 2, 'High'], [0.7, 2, 'Medium'], [0.4, 1, 'Medium'], [1, 0, 'Low'],
  ])("estimates impact at score %s with %s high priorities as %s", (score, count, impact) => {
    const ids = ['image-alt', 'document-title', 'render-blocking-resources', 'uses-text-compression'].slice(0, count);
    const report = engine.generateRecommendations(psiResponse({ score, audits: Object.fromEntries(ids.map(id => [id, { score: 0 }])) }));
    expect(report.summary).toEqual({ totalRecommendations: count, highPriority: count, mediumPriority: 0, lowPriority: 0, estimatedImpact: impact });
  });

  it("only includes mapped insights with actionable items and never a passing insight", () => {
    const report = engine.generateRecommendations(psiResponse({ audits: {
      'image-delivery-insight': { score: null, details: { items: [{ url: 'hero.png' }] } },
      'render-blocking-insight': { score: 1, details: { items: [{ url: 'pass.css' }] } },
      'third-parties-insight': { score: null, details: { items: [] } },
      'legacy-javascript-insight': { score: null },
      'unused-css-rules': null,
    } }));
    expect(report.recommendations.map(rec => ({ id: rec.id, title: rec.title, priority: rec.priority, description: rec.description }))).toEqual([
      { id: 'image-delivery-insight', title: '🖼️ Optimize image delivery', priority: 100, description: 'No description available' },
    ]);
    expect(report.recommendations[0].howToFix).toEqual(['Implement srcset attribute for different screen sizes', 'Convert images to modern formats (WebP/AVIF)', 'Compress and resize images to their display dimensions', 'Lazy-load offscreen images with loading="lazy"']);
  });

  it.each([undefined, null, 0.9, 1])("drops multirun failures without consistent evidence (%s)", score => {
    const report = engine.generateRecommendations(psiResponse({
      audits: { 'unused-css-rules': failingAudit() },
      multirunRuns: [{ audits: { 'unused-css-rules': { score: 0 } } }, { lighthouseResult: { audits: score === undefined ? {} : { 'unused-css-rules': { score } } } }],
    }));
    expect(report.recommendations).toEqual([]);
  });

  it("drops an insight missing items in a subsequent run", () => {
    const insight = { score: null, details: { items: [{ url: 'app.js' }] } };
    expect(engine.generateRecommendations(psiResponse({ audits: { 'legacy-javascript-insight': insight }, multirunRuns: [{ audits: { 'legacy-javascript-insight': insight } }, { audits: { 'legacy-javascript-insight': { score: null, details: { items: [] } } } }] })).recommendations).toEqual([]);
  });

  it("renders the exact empty markdown report without an empty quick-win section", () => {
    expect(engine.formatRecommendations(engine.generateRecommendations(psiResponse()))).toBe(
      '# 🚀 Performance Recommendations\n\n**URL:** https://example.com\n**Current Score:** 80/100\n`█████████████░░░` **80/100** 🟠 *(Needs Improvement)*\n**Device:** mobile\n\n## 📊 Summary\n> 🔴 **0** High &nbsp;|&nbsp; 🟡 **0** Medium &nbsp;|&nbsp; 🟢 **0** Low &nbsp;|&nbsp; **Impact:** Low\n\n- **Total Recommendations:** 0\n- **High Priority:** 0 🔴\n- **Medium Priority:** 0 🟡\n- **Low Priority:** 0 🟢\n- **Estimated Impact:** Low\n\n## 📋 All Recommendations (Priority Order)\n'
    );
  });

  it("renders exact priority bands, savings and action limits without snapshots", () => {
    const rec = { id: 'custom', title: 'Fix CSS', description: 'Remove dead rules.', priority: 80, impact: 'medium' as const, effort: 'low' as const, category: 'performance' as const, potentialSavings: '1.2 KiB', howToFix: ['Purge unused CSS', 'Split bundles', 'Inline critical CSS', 'Fourth step'], moreInfo: 'Ship fewer bytes.' };
    const report: RecommendationReport = { url: 'https://x', strategy: 'desktop', overallScore: 42, recommendations: [rec], quickWins: [rec], summary: { totalRecommendations: 1, highPriority: 1, mediumPriority: 0, lowPriority: 0, estimatedImpact: 'Medium' } };
    expect(engine.formatRecommendations(report)).toBe(
      '# 🚀 Performance Recommendations\n\n**URL:** https://x\n**Current Score:** 42/100\n`███████░░░░░░░░░` **42/100** 🔴 *(Poor)*\n**Device:** desktop\n\n## 📊 Summary\n> 🔴 **1** High &nbsp;|&nbsp; 🟡 **0** Medium &nbsp;|&nbsp; 🟢 **0** Low &nbsp;|&nbsp; **Impact:** Medium\n\n- **Total Recommendations:** 1\n- **High Priority:** 1 🔴\n- **Medium Priority:** 0 🟡\n- **Low Priority:** 0 🟢\n- **Estimated Impact:** Medium\n\n## ⚡ Quick Wins (Low Effort, High Impact)\n### 1. Fix CSS\n**Priority Score:** 80/100 | **Impact:** medium | **Effort:** low\n\nRemove dead rules.\n\n**How to fix:**\n- Purge unused CSS\n- Split bundles\n- Inline critical CSS\n- Fourth step\n\n**Potential Savings:** 1.2 KiB\n\n## 📋 All Recommendations (Priority Order)\n### 1. Fix CSS 🔴\n**Score:** 80/100 | **Category:** performance | **Impact:** medium | **Effort:** low\n\n**Potential Savings:** 1.2 KiB\n\nRemove dead rules.\n\n**Action Steps:**\n- Purge unused CSS\n- Split bundles\n- Inline critical CSS\n\n*💡 Ship fewer bytes.*\n\n---\n\n'
    );
    for (const [priority, emoji] of [[79, '🟡'], [50, '🟡'], [49, '🟢']] as const) {
      const output = engine.formatRecommendations({ ...report, recommendations: [{ ...rec, priority, potentialSavings: undefined, moreInfo: undefined }], quickWins: [] });
      expect(output).toContain(`### 1. Fix CSS ${emoji}\n**Score:** ${priority}/100`);
      expect(output).not.toContain('Potential Savings');
      expect(output).not.toContain('Ship fewer bytes.');
    }
    const many = Array.from({ length: 12 }, (_, i) => ({ ...rec, title: `Fix ${i + 1}` }));
    const output = engine.formatRecommendations({ ...report, recommendations: many, quickWins: many });
    const [quick, all] = output.split('## 📋 All Recommendations (Priority Order)');
    expect(quick.match(/^### /gm)).toHaveLength(5);
    expect(all.match(/^### /gm)).toHaveLength(10);
    expect(all).not.toContain('Fix 11');
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
