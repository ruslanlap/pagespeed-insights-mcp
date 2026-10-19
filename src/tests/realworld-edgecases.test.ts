import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import nock from "nock";
import { PageSpeedInsightsServer } from "../index.js";
import { cache } from "../cache.js";

vi.mock("../env.js", () => ({
  validateEnv: () => {},
  getEnv: () => ({
    GOOGLE_API_KEY: "edgecases-key",
    REQUEST_TIMEOUT: 30000,
    RETRY_ATTEMPTS: 0,
    CACHE_TTL: 3600,
    MAX_CONCURRENCY: 3,
    LOG_LEVEL: "silent",
    NODE_ENV: "test",
  }),
}));

vi.mock("../logger.js", () => {
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return { getLogger: () => logger, createRequestLogger: () => logger };
});

describe("Agent Beta: Real-World Scenarios & Diagnostics", () => {
  let client: Client;
  let server: Server;
  const url = "https://example.com/edgecase";

  function makeCleanLighthouse() {
    // Perfectly optimized clean site: 100/100, zero opportunities, zero render-blocking, zero layout shifts
    return {
      lighthouseResult: {
        requestedUrl: url,
        finalUrl: url,
        fetchTime: "2026-01-01T00:00:00Z",
        lighthouseVersion: "12.0.0",
        configSettings: { formFactor: "mobile" },
        categories: {
          performance: { score: 1.0, auditRefs: [] },
        },
        audits: {
          "largest-contentful-paint": { id: "largest-contentful-paint", title: "LCP", score: 1.0, displayValue: "0.8 s", numericValue: 800 },
          "first-contentful-paint": { id: "first-contentful-paint", title: "FCP", score: 1.0, displayValue: "0.5 s", numericValue: 500 },
          "cumulative-layout-shift": { id: "cumulative-layout-shift", title: "CLS", score: 1.0, displayValue: "0.00", numericValue: 0 },
          "total-blocking-time": { id: "total-blocking-time", title: "TBT", score: 1.0, displayValue: "0 ms", numericValue: 0 },
          "speed-index": { id: "speed-index", title: "Speed Index", score: 1.0, displayValue: "0.8 s", numericValue: 800 },
          "final-screenshot": { id: "final-screenshot", details: { data: "data:image/jpeg;base64,clean", width: 360, height: 640 } },
          "screenshot-thumbnails": { id: "screenshot-thumbnails", details: { type: "table", items: [{ timing: 200, timestamp: 500, data: "frame-clean" }] } },
          "full-page-screenshot": { id: "full-page-screenshot", details: { screenshot: { data: "full-clean", width: 360, height: 1000 }, nodes: {} } },
          "largest-contentful-paint-element": { id: "largest-contentful-paint-element", details: { type: "table", items: [] } },
          "layout-shift-elements": { id: "layout-shift-elements", details: { type: "table", items: [] } },
          "lcp-lazy-loaded": { id: "lcp-lazy-loaded", details: { type: "table", items: [] } },
          "network-requests": { id: "network-requests", details: { type: "table", items: [] } },
          "resource-summary": { id: "resource-summary", details: { type: "table", items: [] } },
          "total-byte-weight": { id: "total-byte-weight", numericValue: 12000 },
          "network-rtt": { id: "network-rtt", numericValue: 15 },
          "network-server-latency": { id: "network-server-latency", numericValue: 20 },
          "bootup-time": { id: "bootup-time", details: { type: "table", items: [] } },
          "mainthread-work-breakdown": { id: "mainthread-work-breakdown", details: { type: "table", items: [] } },
          "unused-javascript": { id: "unused-javascript", details: { type: "table", items: [] } },
          "duplicated-javascript": { id: "duplicated-javascript", details: { type: "table", items: [] } },
          "legacy-javascript": { id: "legacy-javascript", details: { type: "table", items: [] } },
          "uses-responsive-images": { id: "uses-responsive-images", details: { type: "table", items: [] } },
          "offscreen-images": { id: "offscreen-images", details: { type: "table", items: [] } },
          "uses-optimized-images": { id: "uses-optimized-images", details: { type: "table", items: [] } },
          "modern-image-formats": { id: "modern-image-formats", details: { type: "table", items: [] } },
          "render-blocking-resources": { id: "render-blocking-resources", title: "Render-blocking resources", score: 1.0, displayValue: "0 ms", details: { type: "opportunity", overallSavingsMs: 0, items: [] } },
          "critical-request-chains": { id: "critical-request-chains", details: { chains: {}, longestChain: { length: 0, duration: 0, transferSize: 0 } } },
          "third-party-summary": { id: "third-party-summary", details: { type: "table", items: [] } },
          "third-party-facades": { id: "third-party-facades", details: { type: "table", items: [] } },
        },
      },
    };
  }

  function mockUpstream(body: any, status = 200, query: Record<string, any> = {}) {
    return nock("https://www.googleapis.com")
      .get("/pagespeedonline/v5/runPagespeed")
      .query((q) => {
        if (q.key !== "edgecases-key") return false;
        return Object.entries(query).every(([k, v]) => String(q[k]) === String(v));
      })
      .reply(status, body);
  }

  function mockCrux(body: any, status = 200) {
    return nock("https://chromeuxreport.googleapis.com")
      .post("/v1/records:queryRecord", { url, formFactor: "PHONE" })
      .query({ key: "edgecases-key" })
      .reply(status, body);
  }

  beforeEach(async () => {
    cache.clear();
    nock.disableNetConnect();
    const app = new PageSpeedInsightsServer();
    server = (app as unknown as { server: Server }).server;
    client = new Client({ name: "edgecases-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    try {
      expect(nock.isDone(), `Pending mocks: ${nock.pendingMocks().join(", ")}`).toBe(true);
    } finally {
      await client.close();
      await server.close();
      nock.abortPendingRequests();
      nock.cleanAll();
      nock.enableNetConnect();
      cache.clear();
      vi.useRealTimers();
    }
  });

  it("performance-map generates clean, valid Mermaid code block without syntax errors", async () => {
    mockUpstream(makeCleanLighthouse());
    const result = (await client.callTool({
      name: "pagespeed_analyze_page",
      arguments: { url, report: "performance-map" },
    })) as any;

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    expect(text).toContain("```mermaid");
    expect(text).toContain("graph TD");
    expect(text).toContain('Performance: 100/100');
    // Verify Mermaid graph closing fence
    expect(text).toMatch(/```mermaid[\s\S]+?```/);
  });

  const diagnosticFocuses = [
    "visual",
    "elements",
    "network",
    "javascript",
    "images",
    "render-blocking",
    "third-parties",
  ] as const;

  it.each(diagnosticFocuses)("handles clean site with zero issues for focus=%s without errors", async (focus) => {
    mockUpstream(makeCleanLighthouse());
    const result = (await client.callTool({
      name: "pagespeed_diagnose_page",
      arguments: { url, focus },
    })) as any;

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    expect(text).toBeTruthy();
    expect(text).not.toContain("undefined");
    expect(text).not.toContain("NaN");
  });

  it("handles sparse CrUX metrics without crashing when some metrics are missing", async () => {
    // Only LCP is available; INP and TTFB are missing
    mockCrux({
      record: {
        key: { formFactor: "PHONE" },
        metrics: {
          largest_contentful_paint: { percentiles: { p75: 1900 }, histogram: [] },
          cumulative_layout_shift: { percentiles: { p75: "0.01" }, histogram: [] },
        },
      },
    });

    const result = (await client.callTool({
      name: "pagespeed_get_field_data",
      arguments: { url, scope: "page" },
    })) as any;

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    expect(text).toContain("1900ms (p75)");
    expect(text).toContain("0.01 (p75)");
  });

  it("handles batch analysis with 3 URLs having success, 404, and 500 cleanly", async () => {
    const url1 = "https://example.com/site1";
    const url2 = "https://example.com/site2";
    const url3 = "https://example.com/site3";

    mockUpstream(makeCleanLighthouse(), 200, { url: url1 });
    mockUpstream({ error: { message: "Not found" } }, 404, { url: url2 });
    mockUpstream({ error: { message: "Service unavailable" } }, 503, { url: url3 });

    const result = (await client.callTool({
      name: "pagespeed_analyze_batch",
      arguments: { urls: [url1, url2, url3], report: "summary" },
    })) as any;

    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent.result;
    expect(structured.summary).toEqual({ total: 3, successful: 1, failed: 2 });
    expect(structured.results).toHaveLength(3);
    expect(structured.results[0].url).toBe(url1);
    expect(structured.results[0].result.performance.score).toBe(100);
    expect(structured.results[1].url).toBe(url2);
    expect(structured.results[1].error).toContain("Not found");
    expect(structured.results[2].url).toBe(url3);
    expect(structured.results[2].error).toContain("Service unavailable");
  });
});
