import { describe, it, expect, beforeEach, vi } from "vitest";
import nock from "nock";

const SECRET_KEY = "test-key-handlers";

vi.mock("../env.js", () => ({
  getEnv: () => ({
    GOOGLE_API_KEY: SECRET_KEY,
    REQUEST_TIMEOUT: 30000,
    RETRY_ATTEMPTS: 0,
    CACHE_TTL: 3600,
    MAX_CONCURRENCY: 3,
    LOG_LEVEL: "info",
    NODE_ENV: "test",
  }),
  validateEnv: () => {},
}));

vi.mock("../logger.js", () => {
  const fakeChild = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => fakeChild,
  };
  return { getLogger: () => fakeChild, createRequestLogger: () => fakeChild };
});

const { PageSpeedInsightsServer } = await import("../index.js");
const { cache } = await import("../cache.js");

// Minimal mock of the Lighthouse-shaped response the handlers expect.
function mockPsiResponse(opts: { score?: number; lcp?: string } = {}) {
  const { score = 0.85, lcp = "2.5 s" } = opts;
  return {
    captchaResult: "CAPTCHA_NOT_NEEDED",
    kind: "pagespeedonline#result",
    lighthouseResult: {
      requestedUrl: "https://example.com",
      finalUrl: "https://example.com",
      lighthouseVersion: "12.0.0",
      userAgent: "test",
      fetchTime: "2026-01-01T00:00:00Z",
      environment: {},
      runWarnings: [],
      configSettings: {},
      categories: {
        performance: {
          id: "performance",
          title: "Performance",
          score,
          auditRefs: [],
        },
      },
      audits: {
        "first-contentful-paint": {
          id: "first-contentful-paint",
          title: "First Contentful Paint",
          description: "",
          score: 1,
          scoreDisplayMode: "numeric",
          displayValue: "1.2 s",
          numericValue: 1200,
        },
        "largest-contentful-paint": {
          id: "largest-contentful-paint",
          title: "Largest Contentful Paint",
          description: "",
          score: 1,
          scoreDisplayMode: "numeric",
          displayValue: lcp,
          numericValue: 2500,
        },
        "cumulative-layout-shift": {
          id: "cumulative-layout-shift",
          title: "CLS",
          description: "",
          score: 1,
          scoreDisplayMode: "numeric",
          displayValue: "0.01",
          numericValue: 0.01,
        },
        "speed-index": {
          id: "speed-index",
          title: "Speed Index",
          description: "",
          score: 1,
          scoreDisplayMode: "numeric",
          displayValue: "2.0 s",
          numericValue: 2000,
        },
        "total-blocking-time": {
          id: "total-blocking-time",
          title: "TBT",
          description: "",
          score: 1,
          scoreDisplayMode: "numeric",
          displayValue: "50 ms",
          numericValue: 50,
        },
      },
      categoryGroups: {},
      timing: { total: 1000 },
    },
    analysisUTCTimestamp: "2026-01-01T00:00:00Z",
  };
}

type TextContent = { type: "text"; text: string };
type HandlerResult = { content: TextContent[]; isError?: boolean };

// Cast helpers so we can call the private handler methods directly. Each
// handler is exercised the same way the SDK dispatch would, just without
// going through the schema-driven request router.
function callHandler(server: unknown, name: string, args: unknown): Promise<HandlerResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = (server as any)[name].bind(server);
  return fn(args);
}

describe("PageSpeedInsightsServer handlers", () => {
  let server: InstanceType<typeof PageSpeedInsightsServer>;

  beforeEach(() => {
    server = new PageSpeedInsightsServer();
    nock.cleanAll();
    cache.clear();
  });

  describe("handleAnalyzePageSpeed", () => {
    it("returns a formatted markdown report on success", async () => {
      nock("https://www.googleapis.com")
        .get("/pagespeedonline/v5/runPagespeed")
        .query(true)
        .reply(200, mockPsiResponse({ score: 0.85 }));

      const result = await callHandler(server, "handleAnalyzePageSpeed", {
        url: "https://example.com",
        strategy: "mobile",
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("# PageSpeed Insights Analysis");
      expect(result.content[0].text).toContain("https://example.com");
      expect(result.content[0].text).toContain("85/100");
      expect(result.content[0].text).toContain("Largest Contentful Paint");
    });

    it("returns isError when the upstream API fails", async () => {
      nock("https://www.googleapis.com")
        .get("/pagespeedonline/v5/runPagespeed")
        .query(true)
        .reply(500, { error: { message: "boom" } });

      const result = await callHandler(server, "handleAnalyzePageSpeed", {
        url: "https://example.com",
        strategy: "mobile",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Error analyzing page speed/);
    });

    it("rejects non-http(s) URLs at the schema boundary", async () => {
      const result = await callHandler(server, "handleAnalyzePageSpeed", {
        url: "file:///etc/passwd",
        strategy: "mobile",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error");
    });
  });

  describe("handlePerformanceSummary", () => {
    it("returns a JSON payload with score and metrics", async () => {
      nock("https://www.googleapis.com")
        .get("/pagespeedonline/v5/runPagespeed")
        .query(true)
        .reply(200, mockPsiResponse({ score: 0.7 }));

      const result = await callHandler(server, "handlePerformanceSummary", {
        url: "https://example.com",
        strategy: "mobile",
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.url).toBe("https://example.com");
      expect(parsed.performance.score).toBe(70);
      expect(parsed.performance.metrics.largestContentfulPaint).toBe("2.5 s");
    });
  });

  describe("handleComparePages", () => {
    it("runs both URLs in parallel and reports the per-metric winner", async () => {
      nock("https://www.googleapis.com")
        .get("/pagespeedonline/v5/runPagespeed")
        .query((q) => q.url === "https://a.example.com")
        .reply(200, mockPsiResponse({ score: 0.9, lcp: "1.5 s" }));

      nock("https://www.googleapis.com")
        .get("/pagespeedonline/v5/runPagespeed")
        .query((q) => q.url === "https://b.example.com")
        .reply(200, mockPsiResponse({ score: 0.6, lcp: "3.5 s" }));

      const result = await callHandler(server, "handleComparePages", {
        urlA: "https://a.example.com",
        urlB: "https://b.example.com",
        strategy: "mobile",
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.urlA).toBe("https://a.example.com");
      expect(parsed.urlB).toBe("https://b.example.com");
      expect(parsed.comparison.scores.urlA).toBe(90);
      expect(parsed.comparison.scores.urlB).toBe(60);
      expect(parsed.comparison.scores.difference).toBe(30);
      // LCP audit also compared — A has 1.5s (higher Lighthouse score) than B at 3.5s.
      expect(parsed.comparison.metrics["largest-contentful-paint"].urlA).toBe("1.5 s");
      expect(parsed.comparison.metrics["largest-contentful-paint"].urlB).toBe("3.5 s");
    });
  });

  describe("handleBatchAnalyze", () => {
    it("aggregates successes and failures across URLs", async () => {
      nock("https://www.googleapis.com")
        .get("/pagespeedonline/v5/runPagespeed")
        .query((q) => q.url === "https://ok.example.com")
        .reply(200, mockPsiResponse({ score: 0.8 }));

      nock("https://www.googleapis.com")
        .get("/pagespeedonline/v5/runPagespeed")
        .query((q) => q.url === "https://broken.example.com")
        .reply(500, { error: { message: "boom" } });

      const result = await callHandler(server, "handleBatchAnalyze", {
        urls: ["https://ok.example.com", "https://broken.example.com"],
        strategy: "mobile",
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.summary.total).toBe(2);
      expect(parsed.summary.successful).toBe(1);
      expect(parsed.summary.failed).toBe(1);
      expect(parsed.results).toHaveLength(2);
      expect(parsed.results[0].url).toBe("https://ok.example.com");
      expect(parsed.results[0].result).toBeDefined();
      expect(parsed.results[1].url).toBe("https://broken.example.com");
      expect(parsed.results[1].error).toBeTruthy();
    });
  });

  describe("handleClearCache", () => {
    it("clears all cached entries and reports the count", async () => {
      cache.set("psi:foo", { x: 1 }, 60_000);
      cache.set("psi:bar", { x: 2 }, 60_000);
      expect(cache.size()).toBe(2);

      const result = await callHandler(server, "handleClearCache", undefined);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("Cache cleared successfully");
      expect(result.content[0].text).toContain("2 cached entries");
      expect(cache.size()).toBe(0);
    });
  });

  describe("handleCruxSummary", () => {
    it("formats the no-data response when CrUX has no record", async () => {
      nock("https://chromeuxreport.googleapis.com")
        .post("/v1/records:queryRecord")
        .query(true)
        .reply(200, {}); // empty body => no record

      const result = await callHandler(server, "handleCruxSummary", {
        url: "https://example.com",
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("No field data available");
    });

    it("formats the p75 metrics when CrUX returns a record", async () => {
      nock("https://chromeuxreport.googleapis.com")
        .post("/v1/records:queryRecord")
        .query(true)
        .reply(200, {
          record: {
            key: { url: "https://example.com", formFactor: "PHONE" },
            metrics: {
              largest_contentful_paint: {
                histogram: [],
                percentiles: { p75: 2200 },
              },
              cumulative_layout_shift: {
                histogram: [],
                percentiles: { p75: 0.05 },
              },
            },
          },
        });

      const result = await callHandler(server, "handleCruxSummary", {
        url: "https://example.com",
        formFactor: "PHONE",
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("CrUX Field Data Summary");
      expect(result.content[0].text).toContain("2200ms");
      expect(result.content[0].text).toContain("0.05");
    });
  });
});
