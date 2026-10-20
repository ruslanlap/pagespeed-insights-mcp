import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setTimeout as pause } from "node:timers/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import nock from "nock";
import { PageSpeedInsightsServer } from "../index.js";
import { cache } from "../cache.js";

vi.mock("../env.js", () => ({
  validateEnv: () => {},
  getEnv: () => ({ GOOGLE_API_KEY: "workflow-test-only", REQUEST_TIMEOUT: 30000, RETRY_ATTEMPTS: 0, CACHE_TTL: 3600, MAX_CONCURRENCY: 3, LOG_LEVEL: "silent", NODE_ENV: "test" }),
}));
vi.mock("../logger.js", () => {
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return { getLogger: () => logger, createRequestLogger: () => logger };
});
const baseline = vi.hoisted(() => ({ value: null as any }));
vi.mock("../baselines.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("../baselines.js")>(),
  getBaseline: () => baseline.value,
  saveBaseline: (_url: string, _strategy: string, mr: any, lighthouseVersion: string) => {
    baseline.value = { recorded: "2026-01-01T00:00:00Z", lighthouseVersion, scores: mr.scores, metrics: mr.metrics };
    return baseline.value;
  },
}));

const url = "https://example.com/product";
const other = "https://example.org/product";
const reports = ["summary", "full", "recommendations", "audit", "performance-map"];
const focuses = ["visual", "elements", "network", "javascript", "images", "render-blocking", "third-parties"];

// Lighthouse-shaped evidence, not mocked parser/engine/handler return values.
function psi(score: number | null = 0.4, label = "mobile", stamp = "2026-01-01T00:00:00Z") {
  const node = { type: "node", selector: `img.${label}`, snippet: `<img class="${label}">`, boundingRect: { top: 10, left: 20, width: 300, height: 200 } };
  const resource = `https://example.com/${label}.js`;
  const image = { url: `https://example.com/${label}.png`, totalBytes: 102400, wastedBytes: 51200, wastedPercent: 50, node };
  const audit = (id: string, extra: Record<string, unknown> = {}) => ({ id, title: id, description: `Fix ${id}. Details.`, score: 0.2, scoreDisplayMode: "numeric", ...extra });
  const table = (id: string, items: any[], extra: Record<string, unknown> = {}) => audit(id, { details: { type: "table", items, ...extra } });
  const audits = {
    "largest-contentful-paint": audit("largest-contentful-paint", { numericValue: 4200, displayValue: "4.2 s" }),
    "first-contentful-paint": audit("first-contentful-paint", { numericValue: 2200, displayValue: "2.2 s" }),
    "cumulative-layout-shift": audit("cumulative-layout-shift", { numericValue: 0.3, displayValue: "0.3" }),
    "total-blocking-time": audit("total-blocking-time", { numericValue: 700, displayValue: "700 ms" }),
    "speed-index": audit("speed-index", { numericValue: 6000, displayValue: "6.0 s" }),
    "max-potential-fid": audit("max-potential-fid", { numericValue: 150, displayValue: "150 ms" }),
    "interactive": audit("interactive", { numericValue: 7000 }),
    "final-screenshot": audit("final-screenshot", { details: { data: `data:image/jpeg;base64,${label}`, width: 360, height: 640 } }),
    "screenshot-thumbnails": table("screenshot-thumbnails", [{ timing: 500, timestamp: 1000, data: `frame-${label}` }]),
    "full-page-screenshot": audit("full-page-screenshot", { details: { screenshot: { data: `full-${label}`, width: 360, height: 2000 }, nodes: { hero: node } } }),
    "largest-contentful-paint-element": table("largest-contentful-paint-element", [{ node }]),
    "layout-shift-elements": table("layout-shift-elements", [{ node, score: 0.125 }]),
    "lcp-lazy-loaded": table("lcp-lazy-loaded", [{ node }]),
    "network-requests": table("network-requests", [{ url: resource, transferSize: 2048, resourceType: "Script", startTime: 100, endTime: 350, priority: "High" }]),
    "resource-summary": table("resource-summary", [{ resourceType: "script", requestCount: 1, transferSize: 2048 }]),
    "total-byte-weight": audit("total-byte-weight", { numericValue: 1048576 }),
    "network-rtt": audit("network-rtt", { numericValue: 75 }),
    "network-server-latency": audit("network-server-latency", { numericValue: 120 }),
    "bootup-time": table("bootup-time", [{ url: resource, total: 300, scripting: 250, scriptParseCompile: 50 }]),
    "mainthread-work-breakdown": table("mainthread-work-breakdown", [{ group: "scriptEvaluation", groupLabel: "Script Evaluation", duration: 250 }]),
    "unused-javascript": table("unused-javascript", [{ url: resource, totalBytes: 4096, wastedBytes: 2048, wastedPercent: 50 }]),
    "duplicated-javascript": table("duplicated-javascript", [{ source: `${label}-duplicate.js`, wastedBytes: 1024 }]),
    "legacy-javascript": table("legacy-javascript", [{ source: `${label}-polyfill.js`, wastedBytes: 1024 }]),
    "uses-responsive-images": table("uses-responsive-images", [image]),
    "offscreen-images": table("offscreen-images", [image]),
    "uses-optimized-images": table("uses-optimized-images", [image]),
    "modern-image-formats": table("modern-image-formats", [image]),
    "render-blocking-resources": audit("render-blocking-resources", { title: `Blocking ${label} CSS`, displayValue: `${label === "desktop" ? 300 : 800} ms`, details: { type: "opportunity", overallSavingsMs: 800, items: [{ url: `https://example.com/${label}.css`, totalBytes: 1024, wastedMs: 800 }] } }),
    "critical-request-chains": audit("critical-request-chains", { details: { chains: {}, longestChain: { length: 2, duration: 900, transferSize: 3072 } } }),
    "third-party-summary": table("third-party-summary", [{ entity: `${label} Analytics`, transferSize: 2048, blockingTime: 120, mainThreadTime: 200, subItems: { items: [{ url: resource, transferSize: 2048 }] } }]),
    "third-party-facades": table("third-party-facades", [{ product: `${label} Video`, transferSize: 4096 }]),
    "color-contrast": audit("color-contrast", { title: `${label} contrast failure` }),
  };
  return {
    analysisUTCTimestamp: stamp,
    lighthouseResult: {
      requestedUrl: url, finalUrl: url, fetchTime: stamp, lighthouseVersion: "12.0.0", configSettings: { formFactor: label }, audits,
      categories: {
        performance: { score, auditRefs: [{ id: "render-blocking-resources", weight: 1 }] },
        accessibility: { score: label === "desktop" ? 0.95 : 0.5, auditRefs: [{ id: "color-contrast", weight: 1 }] },
      },
      stackPacks: [{ title: "React" }],
    },
  };
}
function upstream(body: any = psi(), query: Record<string, any> = {}, status = 200) {
  return nock("https://www.googleapis.com").get("/pagespeedonline/v5/runPagespeed")
    .query(q => q.key === "workflow-test-only" && Object.entries(query).every(([key, value]) => JSON.stringify(Array.isArray(q[key]) ? [...q[key]].sort() : q[key]) === JSON.stringify(Array.isArray(value) ? [...value].sort() : value)))
    .reply(status, body);
}
function crux(scope: string, body: any, status = 200, formFactor = "PHONE") {
  return nock("https://chromeuxreport.googleapis.com").post("/v1/records:queryRecord", {
    [scope === "origin" ? "origin" : "url"]: scope === "origin" ? "https://example.com" : url,
    ...(formFactor === "ALL" ? {} : { formFactor }),
  }).query({ key: "workflow-test-only" }).reply(status, body);
}
async function until(predicate: () => boolean) {
  for (let i = 0; i < 1000; i++) { if (predicate()) return; await pause(1); }
  throw new Error("Workflow did not reach its next measurement");
}

let client: Client;
let server: Server;
async function call(name: string, args: Record<string, unknown> = {}) {
  return await client.callTool({ name, arguments: args }, undefined, { timeout: 180000 }) as any;
}
const text = (result: any) => result.content[0].text as string;
const data = (result: any) => result.structuredContent.result;
beforeEach(async () => {
  cache.clear();
  baseline.value = null;
  nock.disableNetConnect();
  const app = new PageSpeedInsightsServer();
  // Only bridge the transport: every operation below uses actual MCP messages.
  server = (app as unknown as { server: Server }).server;
  client = new Client({ name: "workflow-integration", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
});
afterEach(async () => {
  try {
    expect(nock.isDone(), `Unconsumed HTTP expectations: ${nock.pendingMocks().join(", ")}`).toBe(true);
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

describe("public MCP workflow contract", () => {
  it("negotiates capabilities and lists exactly six executable workflow schemas", async () => {
    expect(client.getServerCapabilities()?.tools).toEqual({});
    const { tools } = await client.listTools();
    expect(tools.map(t => t.name)).toEqual(["pagespeed_analyze_page", "pagespeed_diagnose_page", "pagespeed_get_field_data", "pagespeed_compare_pages", "pagespeed_analyze_batch", "pagespeed_clear_cache"]);
    expect(tools[0].inputSchema.properties?.report).toMatchObject({ enum: reports });
    expect(tools[1].inputSchema.properties?.focus).toMatchObject({ enum: focuses });
    for (const tool of tools) {
      expect(tool.outputSchema?.required).toEqual(["tool", "result"]);
      expect(tool.inputSchema.additionalProperties).toBe(false);
    }
  });

  it.each([0, 1, null])("summary preserves score %s instead of confusing zero with unavailable", async score => {
    upstream(psi(score));
    const result = await call("pagespeed_analyze_page", { url });
    expect(result.isError).toBeFalsy();
    expect(data(result).performance.score).toBe(score === null ? null : score * 100);
    expect(data(result).performance.metrics.largestContentfulPaint).toBe("4.2 s");
    expect(data(result).opportunities[0]).toMatchObject({ title: "Blocking mobile CSS", displayValue: "800 ms" });
  });

  it.each(reports)("report=%s delivers populated evidence through tools/call", async report => {
    upstream(psi(), { url, strategy: "desktop", locale: "uk-UA", category: ["performance", "accessibility"] });
    const result = await call("pagespeed_analyze_page", { url, report, strategy: "desktop", locale: "uk-UA", categories: ["performance", "accessibility"], responseFormat: "json" });
    expect(result.isError).toBeFalsy();
    expect(JSON.parse(text(result))).toEqual(result.structuredContent);
    expect(result.structuredContent.tool).toBe("pagespeed_analyze_page");
    const evidence = JSON.stringify(data(result));
    const required: Record<string, string[]> = {
      summary: ["40", "4.2 s", "Blocking mobile CSS"],
      full: ["40/100", "4.2 s", "Blocking mobile CSS"],
      recommendations: ["Eliminate render-blocking", "Inline critical CSS", "800 ms"],
      audit: ["mobile contrast failure", "50/100", "4.20s", "React"],
      "performance-map": ["mermaid", "40/100", "LCP: 4.2 s", "Blocking mobile CSS"],
    };
    for (const item of required[report]) expect(evidence).toContain(item);
  });

  it.each(reports)("strategy=both retains useful desktop evidence for report=%s", async report => {
    upstream(psi(0.4), { strategy: "mobile" });
    upstream(psi(0.9, "desktop"), { strategy: "desktop" });
    const result = await call("pagespeed_analyze_page", { url, report, strategy: "both", categories: ["performance", "accessibility"] });
    expect(result.isError).toBeFalsy();
    const evidence = JSON.stringify(data(result));
    if (report === "summary") {
      expect(data(result).performance.score).toBe(40);
      expect(data(result).desktop.performance.score).toBe(90);
    } else if (report === "full") {
      expect(evidence).toContain("40/100");
      expect(evidence).toContain("90/100");
    } else {
      expect(evidence).toContain("desktop");
      expect(evidence).toContain(report === "audit" ? "95/100" : report === "recommendations" ? "300 ms" : "90/100");
      expect(evidence).toContain(report === "audit" ? "mobile contrast failure" : report === "recommendations" ? "800 ms" : "40/100");
    }
  });

  const diagnosticEvidence: Record<string, string[]> = {
    visual: ["360x640", "500ms", "360x2000", "1 mapped DOM nodes"],
    elements: ["img.mobile", "0.125", "300x200px", "Remove lazy loading"],
    network: ["mobile.js", "2.0 KB", "250ms", "75ms", "1.00 MB"],
    javascript: ["mobile.js", "300ms", "250ms", "2.0 KB", "mobile-duplicate.js", "mobile-polyfill.js"],
    images: ["mobile.png", "50.0 KB", "img.mobile", "WebP", "0.20 MB"],
    "render-blocking": ["mobile.css", "800ms", "900ms", "async", "defer"],
    "third-parties": ["mobile Analytics", "120ms", "200ms", "mobile Video", "mobile.js"],
  };
  it.each(focuses)("focus=%s returns concrete diagnostic evidence, not an empty heading", async focus => {
    upstream();
    const result = await call("pagespeed_diagnose_page", { url, focus });
    expect(result.isError).toBeFalsy();
    for (const evidence of diagnosticEvidence[focus]) expect(text(result)).toContain(evidence);
    if (focus === "visual") {
      expect(data(result).finalScreenshot.data).toBe("data:image/jpeg;base64,mobile");
      expect(data(result).filmstrip[0]).toMatchObject({ timing: 500, data: "frame-mobile" });
    }
  });

  it.each(focuses)("strategy=both preserves both diagnostic evidence sets for focus=%s", async focus => {
    upstream(psi(), { strategy: "mobile" });
    upstream(psi(0.9, "desktop"), { strategy: "desktop" });
    const result = await call("pagespeed_diagnose_page", { url, focus, strategy: "both" });
    expect(result.isError).toBeFalsy();
    const evidence = JSON.stringify(data(result));
    expect(evidence).toContain("mobile");
    const desktopEvidence: Record<string, string> = {
      visual: "data:image/jpeg;base64,desktop", elements: "img.desktop", network: "desktop.js",
      javascript: "desktop-duplicate.js", images: "desktop.png", "render-blocking": "desktop.css", "third-parties": "desktop Analytics",
    };
    expect(evidence).toContain(desktopEvidence[focus]);
  });

  const routes = [
    ...reports.map(report => ({ name: "pagespeed_analyze_page", args: { url, report }, label: report })),
    ...focuses.map(focus => ({ name: "pagespeed_diagnose_page", args: { url, focus }, label: focus })),
    { name: "pagespeed_compare_pages", args: { url, against: other, mode: "pages" }, label: "compare" },
    { name: "pagespeed_compare_pages", args: { url, mode: "baseline", runs: 2 }, label: "baseline" },
  ];
  it.each(routes)("$label exposes upstream errors as MCP tool errors without losing the session", async ({ name, args, label }) => {
    upstream({ error: { message: "permission denied" } }, { url }, 403);
    if (label === "compare") upstream(psi(), { url: other });
    const result = await call(name, args);
    expect(result.isError).toBe(true);
    expect(text(result)).toContain("403");
    expect(text(result)).toContain("permission denied");
    expect(text(result)).not.toContain("workflow-test-only");
    expect((await client.listTools()).tools).toHaveLength(6);
  });

  it.each(["page", "origin"])("scope=%s preserves p75 milliseconds and unitless CLS", async scope => {
    crux(scope, { record: { key: { formFactor: "PHONE" }, metrics: Object.fromEntries([
      ["largest_contentful_paint", 2300], ["interaction_to_next_paint", 180], ["cumulative_layout_shift", "0.05"], ["first_contentful_paint", 1700], ["experimental_time_to_first_byte", 600],
    ].map(([key, p75]) => [key, { percentiles: { p75 }, histogram: [] }])) } });
    const result = await call("pagespeed_get_field_data", { url: scope === "origin" ? "https://example.com" : url, scope });
    expect(result.isError).toBeFalsy();
    for (const value of ["2300ms (p75)", "180ms (p75)", "0.05 (p75)", "1700ms (p75)", "600ms (p75)"]) expect(text(result)).toContain(value);
    expect(text(result)).not.toContain("0.05ms");
  });
  it.each(["page", "origin"])("scope=%s reports insufficient traffic for upstream 404", async scope => {
    crux(scope, { error: { message: "not found" } }, 404);
    const result = await call("pagespeed_get_field_data", { url: scope === "origin" ? "https://example.com" : url, scope });
    expect(result.isError).toBeFalsy();
    expect(text(result)).toContain("No field data available");
  });
  it.each(["page", "origin"])("scope=%s surfaces upstream field-data errors", async scope => {
    crux(scope, "quota denied", 403);
    const result = await call("pagespeed_get_field_data", { url: scope === "origin" ? "https://example.com" : url, scope });
    expect(result.isError).toBe(true);
    expect(text(result)).toContain("403");
    expect(text(result)).toContain("quota denied");
  });
  it("origin ALL omits formFactor from the actual CrUX request", async () => {
    crux("origin", {}, 200, "ALL");
    expect((await call("pagespeed_get_field_data", { url: "https://example.com", scope: "origin", formFactor: "ALL" })).isError).toBeFalsy();
  });

  it("compares unequal pages with directional score delta and metric winners", async () => {
    const fast = psi(0.9);
    fast.lighthouseResult.audits["largest-contentful-paint"].score = 1;
    fast.lighthouseResult.audits["largest-contentful-paint"].displayValue = "1.2 s";
    upstream(fast, { url });
    upstream(psi(0.4), { url: other });
    const result = await call("pagespeed_compare_pages", { mode: "pages", url, against: other });
    expect(result.isError).toBeFalsy();
    expect(data(result).comparison.scores).toEqual({ urlA: 90, urlB: 40, difference: 50 });
    expect(data(result).comparison.metrics["largest-contentful-paint"]).toEqual({ urlA: "1.2 s", urlB: "4.2 s", better: "A" });
    expect(data(result).comparison.metrics["cumulative-layout-shift"].better).toBe("tie");
  });

  it.each(["summary", "full"])("batch report=%s preserves successful evidence alongside per-URL errors", async report => {
    upstream(psi(0), { url });
    upstream("page unavailable", { url: other }, 400);
    const result = await call("pagespeed_analyze_batch", { urls: [url, other], report });
    expect(result.isError).toBeFalsy();
    expect(data(result).summary).toEqual({ total: 2, successful: 1, failed: 1 });
    expect(data(result).results[0].url).toBe(url);
    if (report === "summary") expect(data(result).results[0].result.performance.score).toBe(0);
    else expect(data(result).results[0].result).toContain("0/100");
    expect(data(result).results[1]).toMatchObject({ url: other, error: expect.stringContaining("page unavailable") });
  });

  it("clear-cache forces fresh PSI and CrUX fetches after cached workflow calls", async () => {
    upstream(psi(0.4));
    crux("page", {});
    const analyze = () => call("pagespeed_analyze_page", { url });
    const field = () => call("pagespeed_get_field_data", { url });
    expect(data(await analyze()).performance.score).toBe(40);
    await field();
    expect(data(await analyze()).performance.score).toBe(40);
    expect(text(await field())).toContain("No field data");
    expect(text(await call("pagespeed_clear_cache"))).toContain("Removed 2 cached entries");
    upstream(psi(0.9));
    crux("page", {});
    expect(data(await analyze()).performance.score).toBe(90);
    await field();
  });

  it("baseline workflow records then compares real multirun spreads without disk writes", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    async function measure(scores: number[]) {
      const scopes = scores.map((score, i) => upstream(psi(score, "mobile", `${score}-${i}`)));
      const pending = call("pagespeed_compare_pages", { mode: "baseline", url, runs: 2 });
      await until(() => scopes[0].isDone() && vi.getTimerCount() >= 1);
      // Let the real HTTP response reach the application before advancing its wait.
      await pause(20);
      await vi.advanceTimersByTimeAsync(65000);
      return pending;
    }
    expect(text(await measure([0.3, 0.4]))).toContain("Baseline recorded");
    const result = await measure([0.8, 0.9]);
    expect(result.isError).toBeFalsy();
    expect(text(result)).toContain("Baseline comparison");
    expect(text(result)).toContain("performance | 35 [30–40] | 85 [80–90] | improved | 40");
  });

  const invalid: Array<[string, Record<string, unknown>, string]> = [
    ["pagespeed_analyze_page", { url: "file:///etc/passwd" }, "http"],
    ["pagespeed_analyze_page", { url, report: "unknown" }, "report"],
    ["pagespeed_analyze_page", { url, runs: 6 }, "runs"],
    ["pagespeed_analyze_page", { url, unexpected: true }, "unexpected"],
    ["pagespeed_diagnose_page", { url, focus: "all" }, "focus"],
    ["pagespeed_get_field_data", { url, formFactor: "ALL" }, "formFactor"],
    ["pagespeed_get_field_data", { url, scope: "origin" }, "bare origin"],
    ["pagespeed_compare_pages", { url, mode: "pages" }, "against"],
    ["pagespeed_compare_pages", { url, mode: "baseline", runs: 1 }, "runs"],
    ["pagespeed_analyze_batch", { urls: [] }, "urls"],
    ["pagespeed_analyze_batch", { urls: Array(11).fill(url) }, "urls"],
  ];
  it.each(invalid)("rejects invalid %s arguments %j at the actual MCP boundary", async (name, args, field) => {
    const result = await call(name, args);
    expect(result.isError).toBe(true);
    expect(text(result)).toContain(field);
    expect(text(result)).toContain("Review the tool schema");
    expect(cache.size()).toBe(0);
  });
  it("unknown tools return migration guidance as a recoverable tool error", async () => {
    const result = await call("analyze_page_speed", { url });
    expect(result.isError).toBe(true);
    expect(text(result)).toContain("tools/list");
  });
});
