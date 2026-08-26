import type { Tool } from "@modelcontextprotocol/sdk/types.js";

const responseFormat = {
  type: "string",
  enum: ["markdown", "json"],
  default: "markdown",
  description: "markdown is concise and readable; json is machine-readable and is also available as structuredContent.",
};
const url = { type: "string", format: "uri", description: "Public http(s) URL, for example https://example.com/products." };
const strategy = { type: "string", enum: ["mobile", "desktop", "both"], default: "mobile", description: "Lighthouse device profile. mobile is the default." };
const categories = { type: "array", items: { type: "string", enum: ["performance", "accessibility", "best-practices", "seo", "pwa"] }, minItems: 1, default: ["performance"], description: "Lighthouse categories to request." };
const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;
const outputSchema: NonNullable<Tool["outputSchema"]> = { type: "object", properties: { tool: { type: "string" }, result: {}, truncated: { type: "boolean" }, truncationMessage: { type: "string" } }, required: ["tool", "result"], additionalProperties: false };

/** v2 public surface: workflow-oriented and intentionally breaking from v1. */
export const V2_TOOLS: Tool[] = [
  {
    name: "pagespeed_analyze_page",
    title: "Analyze a Page with Lighthouse",
    description: "Run a PageSpeed Insights Lighthouse analysis for one public page. Start with report=summary for a health check; choose full for audits, recommendations for a prioritized fix list, audit for non-performance categories, or performance-map for Mermaid. Example: analyze a mobile product page and return the three most useful remediation steps. Returns a report plus structured result. The Google API is contacted and results may be served from the local cache.",
    inputSchema: { type: "object", properties: { url, strategy, categories, locale: { type: "string", default: "en", description: "BCP-47 locale such as en or uk-UA." }, runs: { type: "integer", minimum: 1, maximum: 5, default: 1, description: "Distinct measurements. Use 3–5 when you need a median and spread." }, report: { type: "string", enum: ["summary", "full", "recommendations", "audit", "performance-map"], default: "summary", description: "Amount and shape of returned insight." }, responseFormat: responseFormat }, required: ["url"], additionalProperties: false },
    outputSchema,
    annotations: readOnly,
  },
  {
    name: "pagespeed_diagnose_page",
    title: "Diagnose a Page Performance Problem",
    description: "Inspect one page through exactly one diagnostic lens: visual, elements, network, javascript, images, render-blocking, or third-parties. Use after pagespeed_analyze_page identifies a problem; do not use it for a general score. Example: focus=render-blocking to identify CSS/JS delaying first render. Returns focused evidence rather than a full Lighthouse dump.",
    inputSchema: { type: "object", properties: { url, strategy, focus: { type: "string", enum: ["visual", "elements", "network", "javascript", "images", "render-blocking", "third-parties"], description: "The single diagnostic lens to return." }, responseFormat: responseFormat }, required: ["url", "focus"], additionalProperties: false },
    outputSchema,
    annotations: readOnly,
  },
  {
    name: "pagespeed_get_field_data",
    title: "Get Chrome UX Report Field Data",
    description: "Get real-user Core Web Vitals from Chrome UX Report, not Lighthouse lab measurements. Use scope=page for one URL; use scope=origin with a bare origin when the page has insufficient traffic. Example: check mobile LCP and INP for https://example.com/checkout. Returns p75 field metrics or a clear no-data result.",
    inputSchema: { type: "object", properties: { url, scope: { type: "string", enum: ["page", "origin"], default: "page", description: "page queries one URL; origin aggregates every page on the origin." }, formFactor: { type: "string", enum: ["PHONE", "DESKTOP", "TABLET", "ALL"], default: "PHONE", description: "CrUX device segment. ALL is valid only for scope=origin." }, responseFormat: responseFormat }, required: ["url"], additionalProperties: false },
    outputSchema,
    annotations: readOnly,
  },
  {
    name: "pagespeed_compare_pages",
    title: "Compare Pages or a Stored Baseline",
    description: "Compare two pages now (mode=pages) or measure one page against its locally stored baseline (mode=baseline). Baseline mode records the first call; use runs=3 or more and rely on guaranteed deltas, not medians alone. Example: compare staging against production, or verify whether a deployed fix improved mobile LCP. replaceBaseline overwrites local baseline state.",
    inputSchema: { type: "object", properties: { mode: { type: "string", enum: ["pages", "baseline"], description: "pages compares url and against; baseline compares url to its saved measurement." }, url, against: { ...url, description: "Second URL, required when mode=pages." }, strategy: { type: "string", enum: ["mobile", "desktop"], default: "mobile", description: "Device profile; part of baseline identity." }, categories, runs: { type: "integer", minimum: 1, maximum: 5, default: 1, description: "Use 2–5 for baseline mode; 3 is recommended." }, replaceBaseline: { type: "boolean", default: false, description: "Only baseline mode: overwrite the local stored baseline." }, responseFormat: responseFormat }, required: ["mode", "url"], additionalProperties: false },
    outputSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  },
  {
    name: "pagespeed_analyze_batch",
    title: "Analyze Multiple Pages",
    description: "Analyze 1–10 public URLs and return per-page results plus success/failure counts. Use pagespeed_analyze_page for one URL or pagespeed_compare_pages for a direct comparison. Example: triage the ten highest-traffic landing pages. Progress notifications are emitted when supported by the client.",
    inputSchema: { type: "object", properties: { urls: { type: "array", items: url, minItems: 1, maxItems: 10, description: "One to ten public http(s) URLs." }, strategy, categories, locale: { type: "string", default: "en", description: "BCP-47 locale such as en or uk-UA." }, report: { type: "string", enum: ["summary", "full"], default: "summary", description: "Per-page result detail." }, responseFormat: responseFormat }, required: ["urls"], additionalProperties: false },
    outputSchema,
    annotations: readOnly,
  },
  {
    name: "pagespeed_clear_cache",
    title: "Clear Local PageSpeed Cache",
    description: "Clear only this server process's in-memory PageSpeed response cache, forcing later analysis calls to contact Google again. Use after a deploy when a cached result is stale. It does not change the target website, files, or remote data; repeating the call is safe.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    outputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
];
