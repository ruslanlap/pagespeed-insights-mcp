import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ProgressNotificationSchema } from "@modelcontextprotocol/sdk/types.js";
import nock from "nock";
import { PageSpeedInsightsServer, isProcessEntrypoint } from "../index.js";
import { cache } from "../cache.js";

vi.mock("../env.js", () => ({
  validateEnv: () => {},
  getEnv: () => ({
    GOOGLE_API_KEY: "protocol-resilience-key",
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

describe("Agent Alpha: Protocol & Transport Resilience", () => {
  let client: Client;
  let server: Server;
  const url = "https://example.com/resilience";

  function makeHugePsiResponse() {
    // Generate a massive audit title exceeding 25,000 characters to trigger CHARACTER_LIMIT
    const hugeTitle = "MassiveAudit_" + "X".repeat(26000);
    return {
      lighthouseResult: {
        requestedUrl: url,
        finalUrl: url,
        fetchTime: "2026-01-01T00:00:00Z",
        lighthouseVersion: "12.0.0",
        configSettings: { formFactor: "mobile" },
        categories: {
          performance: { score: 0.5, auditRefs: [{ id: "huge-audit", weight: 1 }] },
        },
        audits: {
          "largest-contentful-paint": { id: "largest-contentful-paint", title: "LCP", score: 0.5, displayValue: "3.5 s", numericValue: 3500 },
          "first-contentful-paint": { id: "first-contentful-paint", title: "FCP", score: 0.8, displayValue: "1.5 s", numericValue: 1500 },
          "cumulative-layout-shift": { id: "cumulative-layout-shift", title: "CLS", score: 0.9, displayValue: "0.02", numericValue: 0.02 },
          "total-blocking-time": { id: "total-blocking-time", title: "TBT", score: 0.6, displayValue: "250 ms", numericValue: 250 },
          "speed-index": { id: "speed-index", title: "Speed Index", score: 0.7, displayValue: "2.8 s", numericValue: 2800 },
          "huge-audit": {
            id: "huge-audit",
            title: hugeTitle,
            description: "Some description",
            score: 0.1,
            displayValue: "1200 ms",
            details: {
              type: "opportunity",
              overallSavingsMs: 1200,
              items: [{ url: "https://example.com/big.js", wastedMs: 1200, totalBytes: 500000 }],
            },
          },
        },
      },
    };
  }

  function mockUpstream(body: any, status = 200, query: Record<string, any> = {}) {
    return nock("https://www.googleapis.com")
      .get("/pagespeedonline/v5/runPagespeed")
      .query((q) => {
        if (q.key !== "protocol-resilience-key") return false;
        return Object.entries(query).every(([k, v]) => String(q[k]) === String(v));
      })
      .reply(status, body);
  }

  beforeEach(async () => {
    cache.clear();
    nock.disableNetConnect();
    const app = new PageSpeedInsightsServer();
    server = (app as unknown as { server: Server }).server;
    client = new Client({ name: "protocol-resilience-client", version: "1.0.0" });
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

  it("truncates responses exceeding 25,000 characters and sets truncated flag (Markdown format)", async () => {
    mockUpstream(makeHugePsiResponse());
    const result = (await client.callTool({
      name: "pagespeed_analyze_page",
      arguments: { url, report: "full", responseFormat: "markdown" },
    })) as any;

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent.truncated).toBe(true);
    expect(result.structuredContent.truncationMessage).toContain("Response limited to 25000 characters");
    expect(result.content[0].text).toContain("[Truncated at 25000 characters.");
    expect(result.content[0].text.length).toBeLessThan(26000);
  });

  it("truncates JSON responses and preserves structuredContent metadata", async () => {
    mockUpstream(makeHugePsiResponse());
    const result = (await client.callTool({
      name: "pagespeed_analyze_page",
      arguments: { url, report: "full", responseFormat: "json" },
    })) as any;

    expect(result.isError).toBeFalsy();
    const parsedText = JSON.parse(result.content[0].text);
    expect(parsedText.truncated).toBe(true);
    expect(parsedText.tool).toBe("pagespeed_analyze_page");
    expect(parsedText.truncationMessage).toContain("25000 characters");
    expect(result.structuredContent.truncated).toBe(true);
  });

  it("sends progress notifications when progressToken is provided", async () => {
    mockUpstream(makeHugePsiResponse());

    const notifications: any[] = [];
    client.setNotificationHandler(ProgressNotificationSchema, (notification) => {
      notifications.push(notification);
    });

    const result = (await client.callTool({
      name: "pagespeed_analyze_page",
      arguments: { url, report: "summary" },
      _meta: { progressToken: "token-42" },
    })) as any;

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent.tool).toBe("pagespeed_analyze_page");
  });

  it("marks result as isError when one strategy fails in strategy=both", async () => {
    // In diagnose_page, strategy=both calls handleBothStrategies
    mockUpstream(makeHugePsiResponse(), 200, { strategy: "mobile" });
    mockUpstream({ error: { message: "Internal server error" } }, 500, { strategy: "desktop" });

    const result = (await client.callTool({
      name: "pagespeed_diagnose_page",
      arguments: { url, focus: "render-blocking", strategy: "both" },
    })) as any;

    expect(result.isError).toBe(true);
    const text = result.content[0].text;
    expect(text).toContain("## Mobile");
    expect(text).toContain("## Desktop");
    expect(text).toContain("Internal server error");
  });

  it("isProcessEntrypoint safely catches and returns false when file does not exist", () => {
    const bogusFile = "file:///tmp/does-not-exist-" + Date.now() + ".js";
    const nonExistentArgv = "/non/existent/path/script-" + Date.now() + ".js";
    expect(isProcessEntrypoint(bogusFile, nonExistentArgv)).toBe(false);
  });
});
