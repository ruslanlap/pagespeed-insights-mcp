import { describe, it, expect } from "vitest";
import { ResponseParser } from "../response-parser.js";
import type { PageSpeedInsightsResponse } from "../types.js";

/**
 * Builds a mock Lighthouse 13 response that ONLY contains insight-style audits
 * (no legacy opportunity IDs). Used to verify the fallback paths in
 * ResponseParser don't silently return empty data.
 */
function lighthouse13Response(): PageSpeedInsightsResponse {
  return {
    captchaResult: "CAPTCHA_NOT_NEEDED",
    lighthouseResult: {
      requestedUrl: "https://example.com",
      finalUrl: "https://example.com",
      lighthouseVersion: "13.0.0",
      userAgent: "test",
      fetchTime: "2026-01-01T00:00:00Z",
      environment: {},
      runWarnings: [],
      configSettings: {},
      // Lighthouse 13 promotes fullPageScreenshot out of audits to top-level.
      fullPageScreenshot: {
        screenshot: { data: "base64-fullpage", width: 1200, height: 800 },
        nodes: { "node-1": { type: "node", selector: "img.hero", snippet: "<img>" } },
      },
      audits: {
        "image-delivery-insight": {
          id: "image-delivery-insight",
          title: "Image delivery",
          description: "",
          score: null,
          scoreDisplayMode: "informative",
          details: {
            type: "table",
            items: [
              {
                url: "https://example.com/big.png",
                totalBytes: 200_000,
                node: { type: "node", selector: "img.big", snippet: "<img src=big.png>" },
                subItems: {
                  items: [
                    { reason: "resize", wastedBytes: 50_000 },
                    { reason: "compress", wastedBytes: 30_000 },
                    { reason: "use modern format", wastedBytes: 20_000 },
                  ],
                },
              },
              {
                url: "https://example.com/lazy.jpg",
                totalBytes: 80_000,
                node: { type: "node", selector: "img.lazy", snippet: "<img>" },
                subItems: { items: [{ reason: "offscreen", wastedBytes: 10_000 }] },
              },
            ],
          },
        },
        "third-parties-insight": {
          id: "third-parties-insight",
          title: "Third parties",
          description: "",
          score: null,
          scoreDisplayMode: "informative",
          details: {
            type: "table",
            items: [
              { entity: "Google Analytics", transferSize: 45_000, mainThreadTime: 120 },
              { entity: "Facebook", transferSize: 80_000, mainThreadTime: 90 },
            ],
          },
        },
        "render-blocking-insight": {
          id: "render-blocking-insight",
          title: "Render blocking",
          description: "",
          score: null,
          scoreDisplayMode: "informative",
          metricSavings: { FCP: 800 },
          details: {
            type: "table",
            items: [
              { url: "https://example.com/style.css", totalBytes: 12_000, wastedMs: 400 },
            ],
          },
        },
        "network-dependency-tree-insight": {
          id: "network-dependency-tree-insight",
          title: "Network dependency tree",
          description: "",
          score: null,
          scoreDisplayMode: "informative",
          details: {
            type: "table",
            items: [
              {
                value: {
                  chains: {
                    a: { url: "https://example.com/", transferSize: 1000, navStartToEndTime: 50, children: {} },
                  },
                },
              },
            ],
          },
        },
        "lcp-discovery-insight": {
          id: "lcp-discovery-insight",
          title: "LCP discovery",
          description: "",
          score: null,
          scoreDisplayMode: "informative",
          details: {
            type: "table",
            items: [
              { node: { type: "text", value: "Summary" } },
              { node: { type: "node", selector: "h1.hero", snippet: "<h1>" }, lazyLoaded: true },
            ],
          },
        },
        "cls-culprits-insight": {
          id: "cls-culprits-insight",
          title: "CLS culprits",
          description: "",
          score: null,
          scoreDisplayMode: "informative",
          details: {
            type: "table",
            items: [
              { node: { type: "text", value: "Total" }, score: 0.25 },
              { node: { type: "node", selector: "div.ad", snippet: "<div>" }, score: 0.15 },
            ],
          },
        },
        "duplicated-javascript-insight": {
          id: "duplicated-javascript-insight",
          title: "Duplicated JS",
          description: "",
          score: null,
          scoreDisplayMode: "informative",
          details: {
            type: "table",
            items: [{ source: "vendor.js", totalBytes: 100_000, wastedBytes: 40_000 }],
          },
        },
        "legacy-javascript-insight": {
          id: "legacy-javascript-insight",
          title: "Legacy JS",
          description: "",
          score: null,
          scoreDisplayMode: "informative",
          details: {
            type: "table",
            items: [{ source: "polyfills.js", totalBytes: 30_000, wastedBytes: 15_000 }],
          },
        },
      },
      categories: {
        performance: { id: "performance", title: "Performance", score: 0.55, auditRefs: [] },
      },
      categoryGroups: {},
      timing: { total: 1000 },
    },
  };
}

describe("ResponseParser — Lighthouse 13 insight fallbacks", () => {
  const response = lighthouse13Response();

  it("extracts top-level fullPageScreenshot (no full-page-screenshot audit)", () => {
    const visual = ResponseParser.extractVisualData(response);
    expect(visual.fullPageScreenshot).not.toBeNull();
    expect(visual.fullPageScreenshot!.screenshot.data).toBe("base64-fullpage");
    expect(visual.fullPageScreenshot!.nodes["node-1"].selector).toBe("img.hero");
  });

  it("splits image-delivery-insight by reason into 4 legacy buckets", () => {
    const img = ResponseParser.extractImageOptimizationData(response);
    expect(img.responsiveImages).toHaveLength(1); // "resize"
    expect(img.responsiveImages[0].url).toBe("https://example.com/big.png");
    expect(img.unoptimizedImages).toHaveLength(1); // "compress"
    expect(img.unoptimizedImages[0].wastedBytes).toBe(30_000);
    expect(img.modernFormats).toHaveLength(1); // "modern format"
    expect(img.modernFormats[0].wastedBytes).toBe(20_000);
    expect(img.offscreenImages).toHaveLength(1); // "offscreen"
    expect(img.offscreenImages[0].url).toBe("https://example.com/lazy.jpg");
  });

  it("reads third-parties-insight with no blockingTime (uses 0)", () => {
    const tp = ResponseParser.extractThirdPartyData(response);
    expect(tp.summary).toHaveLength(2);
    expect(tp.summary[0].entity).toBe("Google Analytics");
    expect(tp.summary.every(i => i.blockingTime === 0)).toBe(true);
    expect(tp.totalTransferSize).toBe(125_000);
    expect(tp.totalBlockingTime).toBe(0);
  });

  it("reads render-blocking-insight and derives totalWastedMs from metricSavings.FCP", () => {
    const rb = ResponseParser.extractRenderBlockingData(response);
    expect(rb.resources).toHaveLength(1);
    expect(rb.resources[0].url).toBe("https://example.com/style.css");
    expect(rb.totalWastedMs).toBe(800);
  });

  it("falls back to network-dependency-tree-insight for critical chains", () => {
    const rb = ResponseParser.extractRenderBlockingData(response);
    expect(rb.criticalChains).not.toBeNull();
    expect((rb.criticalChains as any).type).toBe("network-dependency-tree");
    expect((rb.criticalChains as any).chains).toHaveLength(1);
  });

  it("extracts LCP element from lcp-discovery-insight (skipping text summary)", () => {
    const el = ResponseParser.extractElementData(response);
    expect(el.lcpElement).not.toBeNull();
    expect(el.lcpElement!.selector).toBe("h1.hero");
  });

  it("extracts lazy-loaded LCP from lcp-discovery-insight lazyLoaded flag", () => {
    const el = ResponseParser.extractElementData(response);
    expect(el.lazyLoadedLcp).not.toBeNull();
    expect(el.lazyLoadedLcp!.selector).toBe("h1.hero");
  });

  it("extracts CLS elements from cls-culprits-insight (filtering text summary)", () => {
    const el = ResponseParser.extractElementData(response);
    expect(el.clsElements).toHaveLength(1);
    expect(el.clsElements[0].node.selector).toBe("div.ad");
  });

  it("separates duplicated-javascript-insight and legacy-javascript-insight", () => {
    const js = ResponseParser.extractJavaScriptData(response);
    expect(js.duplicatedJavaScript).toHaveLength(1);
    expect(js.duplicatedJavaScript[0].source).toBe("vendor.js");
    expect(js.legacyJavaScript).toHaveLength(1);
    expect(js.legacyJavaScript[0].source).toBe("polyfills.js");
  });
});

describe("ResponseParser — backward compat (legacy audits still win)", () => {
  it("prefers legacy uses-responsive-images over image-delivery-insight", () => {
    const response: PageSpeedInsightsResponse = {
      lighthouseResult: {
        requestedUrl: "https://x", finalUrl: "https://x", lighthouseVersion: "12.0.0",
        userAgent: "", fetchTime: "", environment: {}, runWarnings: [], configSettings: {},
        audits: {
          "uses-responsive-images": {
            id: "uses-responsive-images", title: "", description: "",
            score: 0.5, scoreDisplayMode: "opportunity",
            details: { type: "opportunity", items: [{ url: "https://x/a.png", totalBytes: 10, wastedBytes: 5 }] },
          },
          "image-delivery-insight": {
            id: "image-delivery-insight", title: "", description: "",
            score: null, scoreDisplayMode: "informative",
            details: { type: "table", items: [{ url: "https://x/should-not-appear.png", totalBytes: 1, subItems: { items: [{ reason: "resize", wastedBytes: 1 }] } }] },
          },
        },
        categories: {}, categoryGroups: {}, timing: {},
      } as any,
    };
    const img = ResponseParser.extractImageOptimizationData(response);
    expect(img.responsiveImages).toHaveLength(1);
    expect(img.responsiveImages[0].url).toBe("https://x/a.png");
  });
});
