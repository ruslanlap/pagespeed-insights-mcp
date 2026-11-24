/*
 * Copyright 2026 Switas
 *
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE.
 * Part of Switas Web Performance MCP, built on ruslanlap/pagespeed-insights-mcp.
 */
/**
 * WebPageTest tools for the Switas Web Performance MCP.
 *
 * wpt_run_test       – run a real-browser test (location, connectivity, device, repeat view, blocking, scripts)
 * wpt_get_result     – read a finished test through one lens (summary, lcp, cls, long-tasks, requests, third-parties, cache, technologies)
 * wpt_what_if        – measure the gain of removing domains (baseline vs blocked)
 * wpt_list_locations – test locations and remaining test balance
 */
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { WptClient, type WptRunOptions } from "./wpt-client.js";

const WPT = "https://www.webpagetest.org";

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const responseFormat = { type: "string", enum: ["markdown", "json"], default: "markdown", description: "markdown is concise; json is machine-readable." };
const outputSchema: NonNullable<Tool["outputSchema"]> = { type: "object", properties: { tool: { type: "string" }, result: {}, truncated: { type: "boolean" }, truncationMessage: { type: "string" } }, required: ["tool", "result"], additionalProperties: false };
const testSettings = {
  location: { type: "string", default: "FRA_DE_02", description: "WebPageTest location id. FRA_DE_02 (Frankfurt) is closest to Turkey; see wpt_list_locations." },
  connectivity: { type: "string", enum: ["4G", "3GFast", "3G", "LTE", "Cable", "DSL", "FIOS", "Native"], default: "4G", description: "Network throttling profile." },
  device: { type: "string", enum: ["mobile", "desktop"], default: "mobile", description: "mobile emulates a mid-range Android phone; desktop uses a desktop viewport." },
  runs: { type: "integer", minimum: 1, maximum: 5, default: 1, description: "Number of runs; the median run is reported. Each run uses test balance." },
};

export const WPT_TOOLS: Tool[] = [
  {
    name: "wpt_run_test",
    title: "Run a WebPageTest Real-Browser Test",
    description: "Run a WebPageTest test in a real Chrome at a chosen location and network profile. Adds what PageSpeed cannot: repeat view (cache effect), per-request DNS/TCP/TLS/TTFB, filmstrip/video, LCP phase breakdown, request blocking and multi-step scripts. By default waits for completion (usually 1–3 minutes) and returns the summary with automatic findings; if it is still running, call wpt_get_result with the testId later. Uses WebPageTest test balance.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", format: "uri", description: "Public http(s) URL to test." },
        ...testSettings,
        repeatView: { type: "boolean", default: false, description: "Also load the page a second time with a warm browser cache." },
        blockDomains: { type: "array", items: { type: "string" }, description: "Hostnames to block during the test, e.g. [\"dev.visualwebsiteoptimizer.com\"]." },
        script: { type: "string", description: "Optional WebPageTest script for multi-step flows (navigate, click, setValue...). Tab-separated commands, one per line." },
        label: { type: "string", description: "Label shown in the WebPageTest UI." },
        wait: { type: "boolean", default: true, description: "Wait for the result. false returns the testId immediately." },
        maxWaitSeconds: { type: "integer", minimum: 30, maximum: 600, default: 300, description: "How long to wait before returning the testId instead." },
        responseFormat,
      },
      required: ["url"],
      additionalProperties: false,
    },
    outputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  {
    name: "wpt_get_result",
    title: "Read a WebPageTest Result",
    description: "Read a WebPageTest test by testId through one lens: summary (metrics + findings), lcp (element and phase breakdown), cls (layout shifts), long-tasks (main-thread blocking), requests (largest and slowest requests), third-parties (bytes per domain), cache (base page cache status and short-cached assets), technologies (detected stack). Returns status if the test is still running.",
    inputSchema: {
      type: "object",
      properties: {
        testId: { type: "string", description: "WebPageTest test id, e.g. 261124_ZiDc61_28J." },
        view: { type: "string", enum: ["summary", "lcp", "cls", "long-tasks", "requests", "third-parties", "cache", "technologies"], default: "summary" },
        responseFormat,
      },
      required: ["testId"],
      additionalProperties: false,
    },
    outputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: "wpt_what_if",
    title: "Measure the Gain of Removing Third Parties",
    description: "Run the same page twice in parallel, once normally and once with the given domains blocked, and return the metric deltas. Answers questions like 'how much faster would we be without VWO / chat widget / tag X'. Uses 2 x runs of test balance and usually takes 2–4 minutes.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", format: "uri", description: "Public http(s) URL to test." },
        blockDomains: { type: "array", items: { type: "string" }, minItems: 1, description: "Hostnames to block in the experiment run." },
        ...testSettings,
        runs: { ...testSettings.runs, default: 2 },
        maxWaitSeconds: { type: "integer", minimum: 60, maximum: 600, default: 420 },
        responseFormat,
      },
      required: ["url", "blockDomains"],
      additionalProperties: false,
    },
    outputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  {
    name: "wpt_list_locations",
    title: "List WebPageTest Locations",
    description: "List available WebPageTest test locations (optionally filtered by region text such as Europe) and the remaining test balance of the API key.",
    inputSchema: {
      type: "object",
      properties: { region: { type: "string", description: "Optional filter, e.g. Europe, Middle East." }, responseFormat },
      additionalProperties: false,
    },
    outputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
];

export const WPT_TOOL_NAMES = new Set(WPT_TOOLS.map((t) => t.name));

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const Settings = {
  location: z.string().default("FRA_DE_02"),
  connectivity: z.enum(["4G", "3GFast", "3G", "LTE", "Cable", "DSL", "FIOS", "Native"]).default("4G"),
  device: z.enum(["mobile", "desktop"]).default("mobile"),
};
const RunSchema = z.object({
  url: z.string().url(),
  ...Settings,
  runs: z.number().int().min(1).max(5).default(1),
  repeatView: z.boolean().default(false),
  blockDomains: z.array(z.string()).optional(),
  script: z.string().optional(),
  label: z.string().optional(),
  wait: z.boolean().default(true),
  maxWaitSeconds: z.number().int().min(30).max(600).default(300),
});
const ResultSchema = z.object({
  testId: z.string().regex(/^[A-Za-z0-9_]+$/, "Invalid testId"),
  view: z.enum(["summary", "lcp", "cls", "long-tasks", "requests", "third-parties", "cache", "technologies"]).default("summary"),
});
const WhatIfSchema = z.object({
  url: z.string().url(),
  blockDomains: z.array(z.string()).min(1),
  ...Settings,
  runs: z.number().int().min(1).max(5).default(2),
  maxWaitSeconds: z.number().int().min(60).max(600).default(420),
});
const LocationsSchema = z.object({ region: z.string().optional() });

// ---------------------------------------------------------------------------
// Result analysis
// ---------------------------------------------------------------------------

type View = { run: number; fv: any; rv?: any };

function pickMedianRun(data: any): View {
  const run = Number(data?.median?.firstView?.run ?? Object.keys(data?.runs ?? { 1: 0 })[0] ?? 1);
  const r = data.runs?.[run] ?? data.runs?.[String(run)];
  if (!r?.firstView) throw new Error("Test finished without a successful first view (the page may have failed to load).");
  return { run, fv: r.firstView, rv: r.repeatView };
}

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const ms = (v?: number) => (v === undefined ? "–" : v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`);
const kb = (v?: number) => (v === undefined ? "–" : v >= 1_048_576 ? `${(v / 1_048_576).toFixed(2)} MB` : `${Math.round(v / 1024)} KB`);
const short = (u: string, n = 90) => (u.length > n ? `${u.slice(0, n - 1)}…` : u);
const rate = (v: number | undefined, good: number, poor: number) => (v === undefined ? "" : v <= good ? "🟢" : v <= poor ? "🟡" : "🔴");

export function coreMetrics(fv: any) {
  return {
    ttfb: num(fv.TTFB),
    startRender: num(fv.render),
    fcp: num(fv.firstContentfulPaint),
    lcp: num(fv["chromeUserTiming.LargestContentfulPaint"]) ?? num(fv.largestContentfulPaint),
    cls: num(fv["chromeUserTiming.CumulativeLayoutShift"]),
    tbt: num(fv.TotalBlockingTime),
    speedIndex: num(fv.SpeedIndex),
    domInteractive: num(fv.domInteractive),
    fullyLoaded: num(fv.fullyLoaded),
    requests: num(fv.requestsFull) ?? (Array.isArray(fv.requests) ? fv.requests.length : undefined),
    bytes: num(fv.bytesIn),
    connections: num(fv.connections),
  };
}

function baseHost(data: any): string {
  try {
    return new URL(data.testUrl ?? data.url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function headerValue(req: any, name: string): string | undefined {
  const lines: unknown = req?.headers?.response;
  if (!Array.isArray(lines)) return undefined;
  const prefix = `${name.toLowerCase()}:`;
  const hit = lines.find((l) => typeof l === "string" && l.toLowerCase().startsWith(prefix));
  return typeof hit === "string" ? hit.slice(prefix.length).trim() : undefined;
}

export function lcpAnalysis(fv: any) {
  const lcp = coreMetrics(fv).lcp;
  const events = (fv.largestPaints ?? []).filter((p: any) => p.event === "LargestContentfulPaint");
  const ev = events[events.length - 1];
  const html: string = ev?.element?.outerHTML ?? "";
  const url: string | undefined = fv.LargestContentfulPaintImageURL || undefined;
  const req = url ? (fv.requests ?? []).find((r: any) => r.full_url === url) : undefined;
  const ttfb = num(fv.TTFB);
  const reqStart = num(req?.load_start);
  const reqEnd = num(req?.load_end) ?? num(req?.all_end);
  const phases = lcp !== undefined && ttfb !== undefined
    ? req && reqStart !== undefined && reqEnd !== undefined
      ? { ttfb, resourceLoadDelay: Math.max(0, reqStart - ttfb), resourceLoadTime: Math.max(0, reqEnd - reqStart), elementRenderDelay: Math.max(0, lcp - reqEnd) }
      : { ttfb, resourceLoadDelay: 0, resourceLoadTime: 0, elementRenderDelay: Math.max(0, lcp - ttfb) }
    : undefined;
  const lazy = /loading=["']?lazy|owl-lazy|lazyload|\blazy\b|data-src=/i.test(html);
  return {
    lcp,
    element: ev?.element ? { nodeName: ev.element.nodeName, size: ev.size, outerHTML: short(html.replace(/\s+/g, " "), 300) } : undefined,
    resourceUrl: url,
    resource: req ? { bytes: num(req.bytesIn), priority: req.priority, initialPriority: req.initial_priority, ttfb: num(req.ttfb_ms), total: num(req.all_ms) } : undefined,
    phases,
    lazyLoaded: lazy,
  };
}

function clsAnalysis(fv: any) {
  const shifts = (fv.LayoutShifts ?? []).map((s: any) => ({ time: num(s.time), score: num(s.score), rects: s.rects }));
  shifts.sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));
  return { cls: coreMetrics(fv).cls, beforeFirstPaint: fv.LayoutShiftsBeforePaint, shifts: shifts.slice(0, 10) };
}

function longTaskAnalysis(fv: any) {
  const tasks: Array<[number, number]> = Array.isArray(fv.longTasks) ? fv.longTasks : [];
  const durations = tasks.map(([s, e]) => ({ start: s, duration: e - s }));
  durations.sort((a, b) => b.duration - a.duration);
  const total = durations.reduce((acc, t) => acc + t.duration, 0);
  return { tbt: num(fv.TotalBlockingTime), count: tasks.length, totalMs: total, longest: durations.slice(0, 10), cpuBusyMs: num(fv.fullyLoadedCPUms) };
}

function requestAnalysis(fv: any) {
  const reqs: any[] = fv.requests ?? [];
  const pick = (r: any) => ({ url: short(r.full_url, 110), type: r.request_type ?? r.contentType, status: r.responseCode, bytes: num(r.bytesIn), total: num(r.all_ms), ttfb: num(r.ttfb_ms), start: num(r.load_start), priority: r.priority });
  return {
    count: reqs.length,
    byType: Object.fromEntries(Object.entries(fv.breakdown ?? {}).map(([k, v]: [string, any]) => [k, { requests: v.requests, bytes: v.bytes, bytesUncompressed: v.bytesUncompressed }])),
    largest: [...reqs].sort((a, b) => (b.bytesIn ?? 0) - (a.bytesIn ?? 0)).slice(0, 12).map(pick),
    slowest: [...reqs].sort((a, b) => (b.all_ms ?? 0) - (a.all_ms ?? 0)).slice(0, 12).map(pick),
    errors: reqs.filter((r) => r.responseCode >= 400).slice(0, 20).map(pick),
    renderBlocking: fv["possibly-render-blocking-reqs"] ?? [],
  };
}

function thirdPartyAnalysis(data: any, fv: any) {
  const host = baseHost(data);
  const rows = Object.entries(fv.domains ?? {}).map(([domain, v]: [string, any]) => ({
    domain,
    firstParty: host !== "" && (domain === host || domain.endsWith(`.${host}`)),
    requests: v.requests,
    bytes: v.bytes,
    connections: v.connections,
    cdn: v.cdn_provider,
  }));
  rows.sort((a, b) => (b.bytes ?? 0) - (a.bytes ?? 0));
  const third = rows.filter((r) => !r.firstParty);
  return { domains: rows.length, thirdPartyDomains: third.length, thirdPartyBytes: third.reduce((a, r) => a + (r.bytes ?? 0), 0), rows: rows.slice(0, 25) };
}

/** Browser cache lifetime in seconds: max-age from cache-control, else WebPageTest's cache_time. */
function cacheSeconds(req: any): number {
  const cc = String(req.cacheControl ?? headerValue(req, "cache-control") ?? "");
  if (/no-store|no-cache/i.test(cc)) return 0;
  const m = cc.match(/max-age=(\d+)/i);
  return m ? Number(m[1]) : num(req.cache_time) ?? 0;
}

function cacheAnalysis(fv: any) {
  const reqs: any[] = fv.requests ?? [];
  const base = reqs.find((r) => r.is_base_page) ?? reqs[0];
  const staticTypes = /script|stylesheet|image|font/i;
  const shortCached = reqs
    .filter((r) => staticTypes.test(String(r.request_type ?? r.contentType ?? "")) && r.responseCode === 200)
    .map((r) => ({ url: short(r.full_url, 110), cacheSeconds: cacheSeconds(r), cacheControl: String(r.cacheControl ?? ""), bytes: num(r.bytesIn) }))
    .filter((r) => r.cacheSeconds < 86_400)
    .sort((a, b) => (b.bytes ?? 0) - (a.bytes ?? 0));
  return {
    basePage: base ? {
      url: base.full_url,
      ttfb: num(base.ttfb_ms),
      cdn: base.cdn_provider,
      cacheControl: base.cacheControl || headerValue(base, "cache-control"),
      cfCacheStatus: headerValue(base, "cf-cache-status"),
      server: headerValue(base, "server"),
    } : undefined,
    scoreCache: num(fv.score_cache),
    shortCachedCount: shortCached.length,
    shortCached: shortCached.slice(0, 15),
  };
}

/** Switas heuristics: turn raw measurements into actionable findings. */
export function findings(data: any, v: View): string[] {
  const fv = v.fv;
  const m = coreMetrics(fv);
  const lcp = lcpAnalysis(fv);
  const cache = cacheAnalysis(fv);
  const tp = thirdPartyAnalysis(data, fv);
  const detected = JSON.stringify(fv.detected ?? {});
  const out: string[] = [];

  if ((m.ttfb ?? 0) > 800) {
    const cf = cache.basePage?.cfCacheStatus;
    out.push(`🔴 Slow server response: TTFB ${ms(m.ttfb)}${cf ? ` (cf-cache-status: ${cf})` : ""}. ${cf && /BYPASS|MISS|DYNAMIC/i.test(cf) ? "The HTML is not served from the CDN cache; enable edge caching for this page type." : "Check origin rendering time and HTML caching."}`);
  }
  if (lcp.lazyLoaded) {
    out.push(`🔴 The LCP element is lazy-loaded (${lcp.element?.nodeName ?? "element"} uses lazy/data-src). Load the first visible image eagerly with fetchpriority="high" and a real src.`);
  }
  if (lcp.phases && lcp.phases.elementRenderDelay > 1500) {
    out.push(`🟡 LCP render delay is ${ms(lcp.phases.elementRenderDelay)}: the resource is ready but the element paints late (JS-driven slider, hidden content or main-thread blocking).`);
  }
  if (lcp.phases && lcp.phases.resourceLoadDelay > 1500) {
    out.push(`🟡 The LCP resource starts downloading ${ms(lcp.phases.resourceLoadDelay)} after TTFB. Make it discoverable in HTML (preload / direct src).`);
  }
  if (/VWO|Visual Website Optimizer/i.test(detected) || /visualwebsiteoptimizer/i.test(JSON.stringify(Object.keys(fv.domains ?? {})))) {
    out.push("ℹ️ VWO detected. Its SmartCode can hide the page while the A/B test loads (settings_tolerance), but the effect varies by site: measure it with wpt_what_if blocking dev.visualwebsiteoptimizer.com before recommending removal.");
  }
  if ((m.cls ?? 0) > 0.1) {
    const top = clsAnalysis(fv).shifts[0];
    out.push(`${(m.cls ?? 0) > 0.25 ? "🔴" : "🟡"} CLS ${m.cls?.toFixed(3)}; largest shift ${top?.score?.toFixed(3) ?? "?"} at ${ms(top?.time)}. Reserve space for images, sliders and banners.`);
  }
  if ((m.tbt ?? 0) > 600) {
    const lt = longTaskAnalysis(fv);
    out.push(`🔴 Main thread blocked: TBT ${ms(m.tbt)}, ${lt.count} long tasks, longest ${ms(lt.longest[0]?.duration)}. This drives poor INP.`);
  }
  const rb: string[] = fv["possibly-render-blocking-reqs"] ?? [];
  if (rb.length) out.push(`🟡 ${rb.length} render-blocking request(s): ${rb.slice(0, 3).map((u) => short(u, 70)).join(", ")}${rb.length > 3 ? "…" : ""}`);
  const js = fv.breakdown?.js;
  if (js?.bytes > 1_000_000) out.push(`🟡 ${kb(js.bytes)} of JavaScript (${kb(js.bytesUncompressed)} uncompressed) across ${js.requests} files.`);
  if (tp.thirdPartyDomains > 15) out.push(`🟡 ${tp.thirdPartyDomains} third-party domains, ${kb(tp.thirdPartyBytes)} transferred. Audit tags in GTM.`);
  if (cache.shortCachedCount > 10) out.push(`🟡 ${cache.shortCachedCount} static assets cached for less than a day.`);
  if (v.rv) {
    const r = coreMetrics(v.rv);
    out.push(`ℹ️ Repeat view (warm cache): LCP ${ms(r.lcp)}, ${r.requests ?? "?"} requests, ${kb(r.bytes)}.`);
  }
  return out;
}

function links(data: any, run: number) {
  const id = data.id;
  const fv = data.runs?.[run]?.firstView;
  return {
    result: `${WPT}/result/${id}/`,
    waterfall: fv?.images?.waterfall,
    connectionView: fv?.images?.connectionView,
    filmstrip: `${WPT}/video/compare.php?tests=${id}-r:${run}-c:0`,
    screenshot: fv?.images?.screenShot,
  };
}

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

function metricsTable(m: ReturnType<typeof coreMetrics>): string {
  return [
    "| Metric | Value | |",
    "|---|---|---|",
    `| TTFB | ${ms(m.ttfb)} | ${rate(m.ttfb, 800, 1800)} |`,
    `| Start render | ${ms(m.startRender)} | |`,
    `| FCP | ${ms(m.fcp)} | ${rate(m.fcp, 1800, 3000)} |`,
    `| LCP | ${ms(m.lcp)} | ${rate(m.lcp, 2500, 4000)} |`,
    `| CLS | ${m.cls?.toFixed(3) ?? "–"} | ${rate(m.cls, 0.1, 0.25)} |`,
    `| TBT | ${ms(m.tbt)} | ${rate(m.tbt, 200, 600)} |`,
    `| Speed Index | ${ms(m.speedIndex)} | ${rate(m.speedIndex, 3400, 5800)} |`,
    `| Fully loaded | ${ms(m.fullyLoaded)} | |`,
    `| Requests / bytes | ${m.requests ?? "–"} / ${kb(m.bytes)} | |`,
  ].join("\n");
}

function renderSummary(data: any, v: View): string {
  const m = coreMetrics(v.fv);
  const l = links(data, v.run);
  const f = findings(data, v);
  return [
    `# WebPageTest: ${data.testUrl ?? data.url}`,
    `**Test:** ${data.id} · ${String(data.from ?? "").replace(/<[^>]+>/g, "")} · runs: ${Object.keys(data.runs ?? {}).length} (median run ${v.run})`,
    "",
    metricsTable(m),
    "",
    "## Findings",
    ...(f.length ? f.map((x) => `- ${x}`) : ["- No major issues detected by the heuristics."]),
    "",
    "## Links",
    `- Result: ${l.result}`,
    `- Filmstrip/video: ${l.filmstrip}`,
    l.waterfall ? `- Waterfall image: ${l.waterfall}` : null,
    "",
    "Next: wpt_get_result with view=lcp, cls, long-tasks, requests, third-parties, cache or technologies for detail.",
  ].filter((x) => x !== null).join("\n");
}

function renderView(view: string, data: any, v: View): { text: string; structured: unknown } {
  const fv = v.fv;
  switch (view) {
    case "lcp": {
      const a = lcpAnalysis(fv);
      const p = a.phases;
      const text = [
        `# LCP: ${ms(a.lcp)}`,
        a.element ? `**Element:** \`${a.element.nodeName}\`${a.lazyLoaded ? " ⚠️ lazy-loaded" : ""}\n\n\`\`\`html\n${a.element.outerHTML}\n\`\`\`` : "No LCP element recorded.",
        a.resourceUrl ? `**Resource:** ${a.resourceUrl}${a.resource ? ` (${kb(a.resource.bytes)}, priority ${a.resource.priority ?? "?"})` : ""}` : "",
        p ? ["", "| Phase | Time |", "|---|---|", `| TTFB | ${ms(p.ttfb)} |`, `| Resource load delay | ${ms(p.resourceLoadDelay)} |`, `| Resource load time | ${ms(p.resourceLoadTime)} |`, `| Element render delay | ${ms(p.elementRenderDelay)} |`].join("\n") : "",
      ].filter(Boolean).join("\n");
      return { text, structured: a };
    }
    case "cls": {
      const a = clsAnalysis(fv);
      const text = [`# CLS: ${a.cls?.toFixed(3) ?? "–"}`, "", "| Time | Shift score | Area (x,y,w,h) |", "|---|---|---|", ...a.shifts.map((s: any) => `| ${ms(s.time)} | ${s.score?.toFixed(4)} | ${JSON.stringify(s.rects?.[0] ?? [])} |`)].join("\n");
      return { text, structured: a };
    }
    case "long-tasks": {
      const a = longTaskAnalysis(fv);
      const text = [`# Main thread: TBT ${ms(a.tbt)}, ${a.count} long tasks (${ms(a.totalMs)} total), CPU busy ${ms(a.cpuBusyMs)}`, "", "| Start | Duration |", "|---|---|", ...a.longest.map((t) => `| ${ms(t.start)} | ${ms(t.duration)} |`)].join("\n");
      return { text, structured: a };
    }
    case "requests": {
      const a = requestAnalysis(fv);
      const row = (r: any) => `| ${r.url} | ${r.type ?? ""} | ${kb(r.bytes)} | ${ms(r.total)} | ${ms(r.start)} |`;
      const head = "| URL | Type | Bytes | Duration | Starts at |\n|---|---|---|---|---|";
      const text = [
        `# Requests: ${a.count}`,
        "", "| Type | Requests | Transferred | Uncompressed |", "|---|---|---|---|",
        ...Object.entries(a.byType).map(([k, b]: [string, any]) => `| ${k} | ${b.requests} | ${kb(b.bytes)} | ${kb(b.bytesUncompressed)} |`),
        "", "## Largest", head, ...a.largest.map(row),
        "", "## Slowest", head, ...a.slowest.map(row),
        a.errors.length ? ["", "## Errors (4xx/5xx)", head, ...a.errors.map(row)].join("\n") : "",
        a.renderBlocking.length ? ["", "## Possibly render-blocking", ...a.renderBlocking.map((u: string) => `- ${u}`)].join("\n") : "",
      ].join("\n");
      return { text, structured: a };
    }
    case "third-parties": {
      const a = thirdPartyAnalysis(data, fv);
      const text = [`# Domains: ${a.domains} (${a.thirdPartyDomains} third-party, ${kb(a.thirdPartyBytes)})`, "", "| Domain | 1st party | Requests | Bytes | CDN |", "|---|---|---|---|---|", ...a.rows.map((r) => `| ${r.domain} | ${r.firstParty ? "✓" : ""} | ${r.requests} | ${kb(r.bytes)} | ${r.cdn ?? ""} |`)].join("\n");
      return { text, structured: a };
    }
    case "cache": {
      const a = cacheAnalysis(fv);
      const b = a.basePage;
      const text = [
        "# Caching",
        b ? `**HTML:** TTFB ${ms(b.ttfb)} · CDN ${b.cdn ?? "?"} · cf-cache-status ${b.cfCacheStatus ?? "?"} · cache-control \`${b.cacheControl ?? "?"}\`` : "",
        `**Cache score:** ${a.scoreCache ?? "–"} · **Static assets cached < 1 day:** ${a.shortCachedCount}`,
        "", "| Asset | Cache (s) | cache-control | Bytes |", "|---|---|---|---|",
        ...a.shortCached.map((r) => `| ${r.url} | ${r.cacheSeconds} | ${r.cacheControl} | ${kb(r.bytes)} |`),
      ].join("\n");
      return { text, structured: a };
    }
    case "technologies": {
      const det = fv.detected ?? {};
      const text = ["# Detected technologies", "", ...Object.entries(det).map(([k, val]) => `- **${k}:** ${val}`)].join("\n");
      return { text, structured: det };
    }
    default:
      return { text: renderSummary(data, v), structured: { id: data.id, url: data.testUrl, run: v.run, metrics: coreMetrics(fv), repeatView: v.rv ? coreMetrics(v.rv) : undefined, findings: findings(data, v), links: links(data, v.run) } };
  }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

type ToolResult = { content: Array<{ type: "text"; text: string }>; structuredData?: unknown; isError?: boolean };

export class WptTools {
  private readonly results = new Map<string, any>();

  constructor(private readonly client: WptClient) {}

  private remember(id: string, data: any) {
    this.results.set(id, data);
    if (this.results.size > 10) this.results.delete(this.results.keys().next().value as string);
  }

  private async load(testId: string, signal?: AbortSignal): Promise<any> {
    const cached = this.results.get(testId);
    if (cached) return cached;
    const data = await this.client.result(testId, signal);
    this.remember(testId, data);
    return data;
  }

  private options(input: { url: string; location: string; connectivity: string; device: string; runs: number }, extra: Partial<WptRunOptions> = {}): WptRunOptions {
    return {
      url: input.url,
      location: input.location,
      browser: "Chrome",
      connectivity: input.connectivity,
      mobile: input.device === "mobile",
      runs: input.runs,
      firstViewOnly: true,
      ...extra,
    };
  }

  async dispatch(name: string, args: Record<string, unknown>, tick?: () => void, signal?: AbortSignal): Promise<ToolResult> {
    if (!this.client.configured && name !== "wpt_list_locations") {
      return { content: [{ type: "text", text: "Error: WPT_API_KEY is not set for this MCP server. Add -e WPT_API_KEY=... when registering it." }], isError: true };
    }
    switch (name) {
      case "wpt_run_test": {
        const input = RunSchema.parse(args);
        const sub = await this.client.submit(this.options(input, {
          firstViewOnly: !input.repeatView,
          blockDomains: input.blockDomains,
          script: input.script,
          label: input.label,
        }), signal);
        if (!input.wait) {
          return { content: [{ type: "text", text: `Test submitted: **${sub.testId}**\nResult page: ${sub.userUrl}\nCall wpt_get_result with this testId in 1–3 minutes.` }], structuredData: sub };
        }
        const st = await this.client.waitFor(sub.testId, input.maxWaitSeconds * 1000, tick, signal);
        if (st.failed) return { content: [{ type: "text", text: `Error: test ${sub.testId} failed: ${st.statusText}` }], isError: true };
        if (!st.done) {
          return { content: [{ type: "text", text: `Test **${sub.testId}** is still running (${st.statusText}).\nResult page: ${sub.userUrl}\nCall wpt_get_result with this testId shortly.` }], structuredData: { ...sub, status: st } };
        }
        const data = await this.load(sub.testId, signal);
        const r = renderView("summary", data, pickMedianRun(data));
        return { content: [{ type: "text", text: r.text }], structuredData: r.structured };
      }
      case "wpt_get_result": {
        const input = ResultSchema.parse(args);
        if (!this.results.has(input.testId)) {
          const st = await this.client.status(input.testId, signal);
          if (st.failed) return { content: [{ type: "text", text: `Error: test ${input.testId}: ${st.statusText}` }], isError: true };
          if (!st.done) return { content: [{ type: "text", text: `Test ${input.testId} is not finished yet: ${st.statusText}. Try again in a minute.` }], structuredData: st };
        }
        const data = await this.load(input.testId, signal);
        const r = renderView(input.view, data, pickMedianRun(data));
        return { content: [{ type: "text", text: r.text }], structuredData: r.structured };
      }
      case "wpt_what_if": {
        const input = WhatIfSchema.parse(args);
        const [a, b] = await Promise.all([
          this.client.submit(this.options(input, { label: "baseline" }), signal),
          this.client.submit(this.options(input, { label: `blocked: ${input.blockDomains.join(", ")}`, blockDomains: input.blockDomains }), signal),
        ]);
        const deadline = input.maxWaitSeconds * 1000;
        const [sa, sb] = await Promise.all([
          this.client.waitFor(a.testId, deadline, tick, signal),
          this.client.waitFor(b.testId, deadline, undefined, signal),
        ]);
        if (!sa.done || !sb.done) {
          return { content: [{ type: "text", text: `Tests not finished in time. Baseline: ${a.testId} (${sa.statusText}), blocked: ${b.testId} (${sb.statusText}). Read each with wpt_get_result.` }], structuredData: { baseline: a, blocked: b } };
        }
        const [da, db] = await Promise.all([this.load(a.testId, signal), this.load(b.testId, signal)]);
        const ma = coreMetrics(pickMedianRun(da).fv);
        const mb = coreMetrics(pickMedianRun(db).fv);
        const keys: Array<[keyof typeof ma, string, boolean]> = [["ttfb", "TTFB", true], ["startRender", "Start render", true], ["fcp", "FCP", true], ["lcp", "LCP", true], ["speedIndex", "Speed Index", true], ["tbt", "TBT", true], ["cls", "CLS", false], ["fullyLoaded", "Fully loaded", true], ["requests", "Requests", false], ["bytes", "Bytes", false]];
        const fmt = (k: string, v?: number) => (v === undefined ? "–" : k === "cls" ? v.toFixed(3) : k === "bytes" ? kb(v) : k === "requests" ? String(v) : ms(v));
        const rows = keys.map(([k, label]) => {
          const x = ma[k];
          const y = mb[k];
          const d = x !== undefined && y !== undefined ? y - x : undefined;
          const pct = d !== undefined && x ? ` (${d > 0 ? "+" : ""}${Math.round((d / x) * 100)}%)` : "";
          const ds = d === undefined ? "–" : `${d > 0 ? "+" : d < 0 ? "−" : ""}${fmt(k, Math.abs(d))}${pct}`;
          return { metric: label, baseline: x, blocked: y, delta: d, line: `| ${label} | ${fmt(k, x)} | ${fmt(k, y)} | ${ds} |` };
        });
        const text = [
          `# What-if: blocking ${input.blockDomains.join(", ")}`,
          `**Page:** ${input.url} · ${input.device}, ${input.connectivity}, ${input.location} · ${input.runs} run(s) each (median)`,
          "", "| Metric | Baseline | Blocked | Change |", "|---|---|---|---|", ...rows.map((r) => r.line),
          "", `Baseline: ${WPT}/result/${a.testId}/ · Blocked: ${WPT}/result/${b.testId}/`,
          `Filmstrip comparison: ${WPT}/video/compare.php?tests=${a.testId},${b.testId}`,
          "", "Lab results are noisy; treat changes under ~10% as within noise unless runs ≥ 3.",
        ].join("\n");
        return { content: [{ type: "text", text }], structuredData: { baseline: a.testId, blocked: b.testId, rows: rows.map(({ line, ...r }) => r) } };
      }
      case "wpt_list_locations": {
        const input = LocationsSchema.parse(args);
        const [locs, balance] = await Promise.all([this.client.locations(signal), this.client.configured ? this.client.balance(signal).catch(() => undefined) : Promise.resolve(undefined)]);
        const rows = Object.entries(locs)
          .map(([id, v]: [string, any]) => ({ id, label: v.Label, group: v.group, browsers: v.Browsers ?? v.Browser }))
          .filter((r) => !input.region || `${r.group} ${r.label}`.toLowerCase().includes(input.region.toLowerCase()));
        const text = [`# WebPageTest locations${balance !== undefined ? ` · remaining test balance: ${balance}` : ""}`, "", "| Id | Location | Region |", "|---|---|---|", ...rows.map((r) => `| ${r.id} | ${r.label} | ${r.group} |`)].join("\n");
        return { content: [{ type: "text", text }], structuredData: { balance, locations: rows } };
      }
      default:
        return { content: [{ type: "text", text: `Error: unknown WebPageTest tool ${name}` }], isError: true };
    }
  }
}
