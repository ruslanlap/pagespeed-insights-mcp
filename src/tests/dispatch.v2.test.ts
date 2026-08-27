import { describe, it, expect, beforeEach, vi } from "vitest";
import nock from "nock";

const SECRET_KEY = "test-key-dispatch";

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

// Same minimal Lighthouse-shaped fixture the handler tests use.
function mockPsiResponse(opts: { score?: number } = {}) {
  const { score = 0.85 } = opts;
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
        performance: { id: "performance", title: "Performance", score, auditRefs: [] },
      },
      audits: {
        "first-contentful-paint": { id: "first-contentful-paint", title: "First Contentful Paint", description: "", score: 1, scoreDisplayMode: "numeric", displayValue: "1.2 s", numericValue: 1200 },
        "largest-contentful-paint": { id: "largest-contentful-paint", title: "Largest Contentful Paint", description: "", score: 1, scoreDisplayMode: "numeric", displayValue: "2.5 s", numericValue: 2500 },
        "cumulative-layout-shift": { id: "cumulative-layout-shift", title: "CLS", description: "", score: 1, scoreDisplayMode: "numeric", displayValue: "0.01", numericValue: 0.01 },
        "speed-index": { id: "speed-index", title: "Speed Index", description: "", score: 1, scoreDisplayMode: "numeric", displayValue: "2.0 s", numericValue: 2000 },
        "total-blocking-time": { id: "total-blocking-time", title: "TBT", description: "", score: 1, scoreDisplayMode: "numeric", displayValue: "50 ms", numericValue: 50 },
      },
      categoryGroups: {},
      timing: { total: 1000 },
    },
    analysisUTCTimestamp: "2026-01-01T00:00:00Z",
  };
}

type TextContent = { type: "text"; text: string };
type DispatchResult = { content: TextContent[]; isError?: boolean; structuredContent?: any };

function callDispatch(server: unknown, name: string, args: unknown): Promise<DispatchResult> {
  const fn = (server as any)["dispatchTool"].bind(server);
  return fn(name, args);
}

describe("v2 dispatchTool routing (public tool surface)", () => {
  let server: InstanceType<typeof PageSpeedInsightsServer>;

  beforeEach(() => {
    server = new PageSpeedInsightsServer();
    nock.cleanAll();
    cache.clear();
  });

  it("routes pagespeed_analyze_page report=summary to the summary handler with v2 categories", async () => {
    nock("https://www.googleapis.com")
      .get("/pagespeedonline/v5/runPagespeed")
      .query(true)
      .reply(200, mockPsiResponse({ score: 0.7 }));

    const result = await callDispatch(server, "pagespeed_analyze_page", {
      url: "https://example.com",
      report: "summary",
      categories: ["performance"],
    });

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    expect(text).toContain('"performance"'); // summary returns JSON
    expect(result.structuredContent?.tool).toBe("pagespeed_analyze_page");
  });

  it("routes report=full to the full markdown report", async () => {
    nock("https://www.googleapis.com")
      .get("/pagespeedonline/v5/runPagespeed")
      .query(true)
      .reply(200, mockPsiResponse({ score: 0.85 }));

    const result = await callDispatch(server, "pagespeed_analyze_page", {
      url: "https://example.com",
      report: "full",
    });

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("# PageSpeed Insights Analysis");
  });

  it("routes report=recommendations to the recommendations engine", async () => {
    nock("https://www.googleapis.com")
      .get("/pagespeedonline/v5/runPagespeed")
      .query(true)
      .reply(200, mockPsiResponse({ score: 0.5 }));

    const result = await callDispatch(server, "pagespeed_analyze_page", {
      url: "https://example.com",
      report: "recommendations",
    });

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text.length).toBeGreaterThan(0);
  });

  it("routes pagespeed_diagnose_page focus=network to the network lens", async () => {
    nock("https://www.googleapis.com")
      .get("/pagespeedonline/v5/runPagespeed")
      .query(true)
      .reply(200, mockPsiResponse());

    const result = await callDispatch(server, "pagespeed_diagnose_page", {
      url: "https://example.com",
      focus: "network",
    });

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("https://example.com");
  });

  it("routes pagespeed_get_field_data scope=page to CrUX page summary", async () => {
    nock("https://chromeuxreport.googleapis.com")
      .post("/v1/records:queryRecord")
      .query(true)
      .reply(200, {});

    const result = await callDispatch(server, "pagespeed_get_field_data", {
      url: "https://example.com",
    });

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("No field data available");
  });

  it("routes pagespeed_get_field_data scope=origin to origin CrUX", async () => {
    nock("https://chromeuxreport.googleapis.com")
      .post("/v1/records:queryRecord")
      .query(true)
      .reply(200, {
        record: {
          key: { origin: "https://example.com", formFactor: "ALL_FORM_FACTORS" },
          metrics: {},
        },
      });

    const result = await callDispatch(server, "pagespeed_get_field_data", {
      url: "https://example.com",
      scope: "origin",
    });

    expect(result.isError).toBeFalsy();
  });

  it("routes pagespeed_compare_pages mode=pages to the two-URL comparison", async () => {
    nock("https://www.googleapis.com")
      .get("/pagespeedonline/v5/runPagespeed")
      .times(2)
      .query(true)
      .reply(200, mockPsiResponse({ score: 0.85 }));

    const result = await callDispatch(server, "pagespeed_compare_pages", {
      mode: "pages",
      url: "https://example.com",
      against: "https://example.org",
    });

    expect(result.isError).toBeFalsy();
    // Compare handler returns a JSON payload with both URLs.
    expect(result.content[0].text).toContain("https://example.org");
    expect(result.structuredContent?.tool).toBe("pagespeed_compare_pages");
  });

  it("routes pagespeed_compare_pages mode=baseline with replaceBaseline to baseline recording", async () => {
    // Routing test: stub the client so we don't wait out Google's ~1min
    // inter-run window (multirun itself has unit tests).
    const fake = mockPsiResponse({ score: 0.85 });
    (fake as any).multirun = {
      stats: { analyses: 3, requested: 3, cachedReplays: 0 },
      scores: { performance: { median: 85, min: 84, max: 86 } },
      metrics: {},
    };
    const spy = vi.spyOn((server as any).client, "analyzePageSpeed").mockResolvedValue(fake);
    try {
      const result = await callDispatch(server, "pagespeed_compare_pages", {
        mode: "baseline",
        url: "https://example.com",
        runs: 3,
        replaceBaseline: true,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("Baseline recorded");
    } finally {
      spy.mockRestore();
    }
  });

  it("routes pagespeed_clear_cache and reports the cleared count", async () => {
    const result = await callDispatch(server, "pagespeed_clear_cache", {});

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toMatch(/cache/i);
  });

  it("rejects an unknown tool name with the v2 migration hint", async () => {
    const result = await callDispatch(server, "analyze_page_speed", { url: "https://example.com" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("pagespeed_*");
  });

  // Schema-boundary rejections: dispatchTool lets Zod throw (the CallTool
  // handler converts it to an isError response), so assert on the throw.
  it("rejects v1 argument shapes at the schema boundary (strategy=both on compare)", async () => {
    await expect(
      callDispatch(server, "pagespeed_compare_pages", {
        mode: "pages",
        url: "https://example.com",
        against: "https://example.org",
        strategy: "both",
      })
    ).rejects.toThrow();
  });

  it("rejects focus=ALL mismatch for page-level field data (ALL is origin-only)", async () => {
    await expect(
      callDispatch(server, "pagespeed_get_field_data", {
        url: "https://example.com",
        scope: "page",
        formFactor: "ALL",
      })
    ).rejects.toThrow();
  });

  it("rejects mode=pages without against", async () => {
    await expect(
      callDispatch(server, "pagespeed_compare_pages", {
        mode: "pages",
        url: "https://example.com",
      })
    ).rejects.toThrow();
  });

  it("rejects mode=baseline with runs<2", async () => {
    await expect(
      callDispatch(server, "pagespeed_compare_pages", {
        mode: "baseline",
        url: "https://example.com",
        runs: 1,
      })
    ).rejects.toThrow();
  });
});

describe("v2 toV2Result envelope", () => {
  let server: InstanceType<typeof PageSpeedInsightsServer>;

  beforeEach(() => {
    server = new PageSpeedInsightsServer();
    nock.cleanAll();
    cache.clear();
  });

  it("returns markdown by default and structuredContent alongside", async () => {
    nock("https://www.googleapis.com")
      .get("/pagespeedonline/v5/runPagespeed")
      .query(true)
      .reply(200, mockPsiResponse({ score: 0.85 }));

    const result = await callDispatch(server, "pagespeed_analyze_page", {
      url: "https://example.com",
      report: "full",
    });

    expect(result.content[0].text).toContain("# PageSpeed Insights Analysis");
    expect(result.structuredContent).toBeDefined();
    expect(result.structuredContent.tool).toBe("pagespeed_analyze_page");
    expect(result.structuredContent.truncated).toBeUndefined();
  });

  it("returns the JSON envelope when responseFormat=json", async () => {
    nock("https://www.googleapis.com")
      .get("/pagespeedonline/v5/runPagespeed")
      .query(true)
      .reply(200, mockPsiResponse({ score: 0.7 }));

    const result = await callDispatch(server, "pagespeed_analyze_page", {
      url: "https://example.com",
      report: "summary",
      responseFormat: "json",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.tool).toBe("pagespeed_analyze_page");
    expect(parsed.result).toBeDefined();
  });

  it("marks truncated responses and keeps the truncation message", async () => {
    const big = mockPsiResponse({ score: 0.85 });
    // The full report prints audit titles — inflate one past the 25k limit.
    (big.lighthouseResult.audits as any)["first-contentful-paint"].title = "x".repeat(40_000);
    nock("https://www.googleapis.com")
      .get("/pagespeedonline/v5/runPagespeed")
      .query(true)
      .reply(200, big);

    const result = await callDispatch(server, "pagespeed_analyze_page", {
      url: "https://example.com",
      report: "full",
    });

    expect(result.content[0].text).toContain("[Truncated at");
    expect(result.structuredContent.truncated).toBe(true);
    expect(result.structuredContent.truncationMessage).toBeTruthy();
  });
});
