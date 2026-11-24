/*
 * Copyright 2026 Switas
 *
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE.
 * Part of Switas Web Performance MCP, built on ruslanlap/pagespeed-insights-mcp.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { WptClient } from "../wpt-client.js";
import { WptTools, WPT_TOOLS, coreMetrics, findings, lcpAnalysis } from "../wpt-tools.js";

const KEY = "test-wpt-key";
const LCP_URL = "https://cdn.example.com/hero.jpg";

/** Synthetic WebPageTest result shaped like jsonResult.php output (no real site data). */
function wptResult(id: string, overrides: Record<string, unknown> = {}) {
  const firstView = {
    run: 1,
    TTFB: 3500,
    render: 9000,
    firstContentfulPaint: 8900,
    "chromeUserTiming.LargestContentfulPaint": 20000,
    "chromeUserTiming.CumulativeLayoutShift": 0.42,
    TotalBlockingTime: 9000,
    SpeedIndex: 15000,
    domInteractive: 12000,
    fullyLoaded: 30000,
    requestsFull: 3,
    bytesIn: 2_500_000,
    connections: 4,
    score_cache: 60,
    fullyLoadedCPUms: 25000,
    LargestContentfulPaintImageURL: LCP_URL,
    largestPaints: [
      { event: "LargestContentfulPaint", time: 20000, size: 50000, element: { nodeName: "IMG", outerHTML: `<img class="slider owl-lazy" data-src="${LCP_URL}">` } },
    ],
    LayoutShifts: [{ time: 19900, score: 0.42, rects: [[0, 0, 412, 700]] }],
    longTasks: [[5000, 7500], [9000, 9200]],
    "possibly-render-blocking-reqs": ["https://cdn.example.com/app.js"],
    breakdown: { js: { requests: 20, bytes: 1_400_000, bytesUncompressed: 4_000_000 }, image: { requests: 30, bytes: 900_000, bytesUncompressed: 900_000 } },
    domains: {
      "www.example.com": { bytes: 200_000, requests: 5, cdn_provider: "Cloudflare", connections: 1 },
      "cdn.example.com": { bytes: 1_200_000, requests: 30, cdn_provider: "Cloudflare", connections: 1 },
      "tags.thirdparty.test": { bytes: 300_000, requests: 4, connections: 1 },
    },
    detected: { Analytics: "VWO,Google Analytics", Ecommerce: "Cart Functionality" },
    requests: [
      { full_url: "https://www.example.com/category", is_base_page: true, request_type: "Document", responseCode: 200, ttfb_ms: 3400, all_ms: 3600, bytesIn: 180_000, cdn_provider: "Cloudflare", cacheControl: "no-cache", headers: { response: ["HTTP/2 200", "cf-cache-status: BYPASS", "server: cloudflare"] } },
      { full_url: LCP_URL, request_type: "Image", responseCode: 200, load_start: 4000, load_end: 4600, all_ms: 600, bytesIn: 300_000, priority: "Medium", cacheControl: "public, max-age=31536000" },
      { full_url: "https://tags.thirdparty.test/tag.js", request_type: "Script", responseCode: 200, load_start: 5000, load_end: 5300, all_ms: 300, bytesIn: 150_000, cacheControl: "private, max-age=900" },
    ],
    images: { waterfall: `https://www.webpagetest.org/result/${id}/1_waterfall.png` },
    ...overrides,
  };
  return {
    statusCode: 200,
    data: { id, url: "https://www.example.com/category", testUrl: "https://www.example.com/category", from: "Frankfurt - <b>Chrome</b>", median: { firstView: { run: 1 } }, runs: { 1: { firstView } } },
  };
}

type Route = (url: URL) => unknown;

function mockFetch(route: Route) {
  const calls: Array<{ url: URL; headers: Record<string, string> }> = [];
  const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    return new Response(JSON.stringify(route(url)), { status: 200, headers: { "content-type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe("WebPageTest analysis", () => {
  const data = wptResult("T1").data;
  const fv = data.runs[1].firstView;

  it("extracts core metrics", () => {
    expect(coreMetrics(fv)).toMatchObject({ ttfb: 3500, lcp: 20000, cls: 0.42, tbt: 9000, requests: 3 });
  });

  it("breaks LCP into phases and flags a lazy-loaded LCP image", () => {
    const lcp = lcpAnalysis(fv);
    expect(lcp.lazyLoaded).toBe(true);
    expect(lcp.phases).toEqual({ ttfb: 3500, resourceLoadDelay: 500, resourceLoadTime: 600, elementRenderDelay: 15400 });
  });

  it("produces actionable findings including CDN bypass", () => {
    const out = findings(data, { run: 1, fv });
    const text = out.join("\n");
    expect(text).toMatch(/TTFB 3\.50 s \(cf-cache-status: BYPASS\)/);
    expect(text).toMatch(/LCP element is lazy-loaded/);
    expect(text).toMatch(/VWO detected/);
    expect(text).toMatch(/CLS 0\.420/);
    expect(text).toMatch(/render-blocking/);
  });
});

describe("WebPageTest tools", () => {
  it("exposes four tools with strict input schemas", () => {
    expect(WPT_TOOLS.map((t) => t.name)).toEqual(["wpt_run_test", "wpt_get_result", "wpt_what_if", "wpt_list_locations"]);
    for (const tool of WPT_TOOLS) expect(tool.inputSchema.additionalProperties).toBe(false);
  });

  it("returns a clear error when WPT_API_KEY is missing", async () => {
    const tools = new WptTools(new WptClient(undefined));
    const r = await tools.dispatch("wpt_get_result", { testId: "T1" });
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toMatch(/WPT_API_KEY is not set/);
  });

  it("sends the key only as a header and renders summary and views", async () => {
    const calls = mockFetch((url) => (url.pathname.endsWith("testStatus.php") ? { statusCode: 200, statusText: "Test Complete" } : wptResult("T1")));
    const tools = new WptTools(new WptClient(KEY));

    const summary = await tools.dispatch("wpt_get_result", { testId: "T1" });
    expect(summary.isError).toBeFalsy();
    expect(summary.content[0].text).toMatch(/\| LCP \| 20\.00 s \| 🔴 \|/);
    expect(summary.content[0].text).toMatch(/## Findings/);

    const cache = await tools.dispatch("wpt_get_result", { testId: "T1", view: "cache" });
    expect(cache.content[0].text).toMatch(/cf-cache-status BYPASS/);
    expect(cache.content[0].text).toMatch(/tags\.thirdparty\.test\/tag\.js \| 900/);
    expect(cache.content[0].text).not.toMatch(/hero\.jpg/); // max-age=31536000 is long-lived

    const tp = await tools.dispatch("wpt_get_result", { testId: "T1", view: "third-parties" });
    expect(tp.content[0].text).toMatch(/\| www\.example\.com \| ✓ \|/);

    for (const c of calls) {
      expect(c.headers["X-WPT-API-KEY"]).toBe(KEY);
      expect(c.url.toString()).not.toContain(KEY);
    }
    // the second and third views are served from the in-memory result cache
    expect(calls.filter((c) => c.url.pathname.endsWith("jsonResult.php"))).toHaveLength(1);
  });

  it("reports a running test instead of failing", async () => {
    mockFetch(() => ({ statusCode: 101, statusText: "Test Started 10 seconds ago" }));
    const r = await new WptTools(new WptClient(KEY)).dispatch("wpt_get_result", { testId: "T2" });
    expect(r.isError).toBeFalsy();
    expect(r.content[0].text).toMatch(/not finished yet/);
  });

  it("submits a run with location, connectivity and blocked domains", async () => {
    const calls = mockFetch((url) => {
      if (url.pathname.endsWith("runtest.php")) return { statusCode: 200, data: { testId: "T3", userUrl: "https://www.webpagetest.org/result/T3/", jsonUrl: "" } };
      return {};
    });
    const r = await new WptTools(new WptClient(KEY)).dispatch("wpt_run_test", { url: "https://www.example.com/", blockDomains: ["tags.thirdparty.test"], wait: false });
    expect(r.content[0].text).toMatch(/Test submitted: \*\*T3\*\*/);
    const q = calls[0].url.searchParams;
    expect(q.get("location")).toBe("FRA_DE_02:Chrome.4G");
    expect(q.get("mobile")).toBe("1");
    expect(q.get("blockDomains")).toBe("tags.thirdparty.test");
  });

  it("compares baseline and blocked runs in wpt_what_if", async () => {
    let submitted = 0;
    mockFetch((url) => {
      if (url.pathname.endsWith("runtest.php")) {
        submitted += 1;
        const id = url.searchParams.get("blockDomains") ? "BLOCKED" : "BASE";
        return { statusCode: 200, data: { testId: id, userUrl: "", jsonUrl: "" } };
      }
      if (url.pathname.endsWith("testStatus.php")) return { statusCode: 200, statusText: "Test Complete" };
      const id = url.searchParams.get("test")!;
      return id === "BLOCKED" ? wptResult(id, { "chromeUserTiming.LargestContentfulPaint": 15000 }) : wptResult(id);
    });
    const r = await new WptTools(new WptClient(KEY)).dispatch("wpt_what_if", { url: "https://www.example.com/", blockDomains: ["tags.thirdparty.test"], runs: 1 });
    expect(submitted).toBe(2);
    expect(r.content[0].text).toMatch(/\| LCP \| 20\.00 s \| 15\.00 s \| −5\.00 s \(-25%\) \|/);
  });
});
