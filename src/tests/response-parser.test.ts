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

  it("extracts Lighthouse 13 LCP list items and nested CLS table rows", () => {
    const node = { type: "node", selector: "#hero", snippet: "<img id=hero>" };
    const response = {
      lighthouseResult: {
        audits: {
          "lcp-discovery-insight": { details: { type: "list", items: [{ type: "checklist", items: {} }, node] } },
          "cls-culprits-insight": { details: { type: "list", items: [{ type: "table", items: [{ node, score: 0.2 }] }] } },
        },
      },
    } as any;

    const result = ResponseParser.extractElementData(response);
    expect(result.lcpElement?.selector).toBe("#hero");
    expect(result.clsElements).toHaveLength(1);
    expect(result.clsElements[0]?.node.selector).toBe("#hero");
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

// Keep fixtures local: each extractor consumes the real audit payload, not mocks.
function auditResponse(audits: Record<string, any> = {}): PageSpeedInsightsResponse {
  return { lighthouseResult: { audits } } as PageSpeedInsightsResponse;
}

describe("ResponseParser — diagnostic contracts", () => {
  it.each([{}, { lighthouseResult: {} }, { lighthouseResult: { audits: null, categories: null } }])("returns explicit empty diagnostics for missing sections: %j", response => {
    const data = response as PageSpeedInsightsResponse;
    expect(ResponseParser.extractVisualData(data)).toEqual({ finalScreenshot: null, filmstrip: [], fullPageScreenshot: null });
    expect(ResponseParser.extractElementData(data)).toEqual({ lcpElement: null, clsElements: [], lazyLoadedLcp: null });
    expect(ResponseParser.extractNetworkData(data)).toEqual({ requests: [], resourceSummary: [], totalByteWeight: 0, requestCount: 0, rtt: null, serverLatency: null });
    expect(ResponseParser.extractJavaScriptData(data)).toEqual({ bootupTime: [], mainThreadWork: [], unusedJavaScript: [], duplicatedJavaScript: [], legacyJavaScript: [] });
    expect(ResponseParser.extractImageOptimizationData(data)).toEqual({ responsiveImages: [], offscreenImages: [], unoptimizedImages: [], modernFormats: [] });
    expect(ResponseParser.extractRenderBlockingData(data)).toEqual({ resources: [], totalWastedMs: 0, criticalChains: null });
    expect(ResponseParser.extractThirdPartyData(data)).toEqual({ summary: [], totalBlockingTime: 0, totalTransferSize: 0, facades: [] });
    expect(ResponseParser.extractOtherCategories(data)).toEqual(Object.fromEntries(['accessibility', 'seo', 'bestPractices', 'pwa'].map(key => [key, { score: null, keyAudits: [] }])));
    expect(ResponseParser.extractDetailedMetrics(data)).toEqual({ firstContentfulPaint: undefined, largestContentfulPaint: undefined, cumulativeLayoutShift: undefined, totalBlockingTime: undefined, maxPotentialFID: undefined, speedIndex: undefined, timeToInteractive: undefined });
  });

  it("preserves legacy screenshots and filmstrip timing, with documented defaults", () => {
    const screenshot = { data: 'full', width: 1440, height: 2400 };
    const response = auditResponse({
      'final-screenshot': { details: { data: 'final' } },
      'screenshot-thumbnails': { details: { items: [{ timing: 100, timestamp: 123, data: 'frame' }, {}] } },
      'full-page-screenshot': { details: { screenshot } },
    });
    (response.lighthouseResult as any).fullPageScreenshot = { screenshot: { data: 'do-not-use' } };
    expect(ResponseParser.extractVisualData(response)).toEqual({
      finalScreenshot: { data: 'final', width: 360, height: 640 },
      filmstrip: [{ timing: 100, timestamp: 123, data: 'frame' }, { timing: 0, timestamp: 0, data: '' }],
      fullPageScreenshot: { screenshot, nodes: {} },
    });
  });

  it("normalizes legacy element metadata without losing layout shift scores", () => {
    const node = { type: 'node', selector: '#hero', snippet: '<img>', lhId: '1', path: '1,HTML,1,BODY', nodeLabel: 'Hero', explanation: 'Moved', boundingRect: { top: 0, left: 0, right: 100, bottom: 50, width: 100, height: 50 } };
    expect(ResponseParser.extractElementData(auditResponse({
      'largest-contentful-paint-element': { details: { items: [{ node }] } },
      'layout-shift-elements': { details: { items: [{ node, score: 0.125 }, { node }, { score: 0.9 }] } },
      'lcp-lazy-loaded': { details: { items: [{ node }] } },
    }))).toEqual({ lcpElement: node, lazyLoadedLcp: node, clsElements: [{ node, score: 0.125 }, { node, score: 0 }] });
  });

  it("preserves network byte counts, timings and unfinished requests", () => {
    const request = { url: 'https://x/app.js', protocol: 'h2', startTime: 0.1, endTime: 1.2, finished: false, transferSize: 1024, resourceSize: 4096, statusCode: 200, mimeType: 'text/javascript', resourceType: 'Script', priority: 'High', experimentalFromMainFrame: false };
    const parsed = ResponseParser.extractNetworkData(auditResponse({
      'network-requests': { details: { items: [request, {}] } },
      'resource-summary': { details: { items: [{ resourceType: 'script', requestCount: 2, transferSize: 1024 }, {}] } },
      'total-byte-weight': { numericValue: 1024 }, 'network-rtt': { numericValue: 0 }, 'network-server-latency': { numericValue: 125.5 },
    }));
    expect(parsed).toEqual({ requests: [request, { url: '', startTime: 0, endTime: 0, finished: true, transferSize: 0, resourceSize: 0, statusCode: 0, mimeType: '', resourceType: '' }], requestCount: 2, resourceSummary: [{ resourceType: 'script', count: 2, size: 1024 }, { resourceType: '', count: 0, size: 0 }], totalByteWeight: 1024, rtt: 0, serverLatency: 125.5 });
  });

  it("extracts JS CPU milliseconds separately from unused and duplicated bytes", () => {
    expect(ResponseParser.extractJavaScriptData(auditResponse({
      'bootup-time': { details: { items: [{ url: 'app.js', total: 120, scripting: 90, scriptParseCompile: 30 }, {}] } },
      'mainthread-work-breakdown': { details: { items: [{ group: 'scriptEvaluation', groupLabel: 'Script Evaluation', duration: 90 }, {}] } },
      'unused-javascript': { details: { items: [{ url: 'app.js', totalBytes: 1000, wastedBytes: 250, wastedPercent: 25 }, {}] } },
      'duplicated-javascript': { details: { items: [{ url: 'vendor.js', totalBytes: 500, wastedBytes: 100 }, {}] } },
      'legacy-javascript': { details: { items: [{ source: 'polyfill.js', totalBytes: 200, wastedBytes: 150 }, {}] } },
    }))).toEqual({
      bootupTime: [{ url: 'app.js', total: 120, scripting: 90, scriptParseCompile: 30 }, { url: '', total: 0, scripting: 0, scriptParseCompile: 0 }],
      mainThreadWork: [{ group: 'scriptEvaluation', groupLabel: 'Script Evaluation', duration: 90 }, { group: '', groupLabel: '', duration: 0 }],
      unusedJavaScript: [{ url: 'app.js', totalBytes: 1000, wastedBytes: 250, wastedPercent: 25 }, { url: '', totalBytes: 0, wastedBytes: 0, wastedPercent: 0 }],
      duplicatedJavaScript: [{ source: 'vendor.js', totalBytes: 500, wastedBytes: 100 }, { source: '', totalBytes: 0, wastedBytes: 0 }],
      legacyJavaScript: [{ source: 'polyfill.js', totalBytes: 200, wastedBytes: 150 }, { source: '', totalBytes: 0, wastedBytes: 0 }],
    });
  });

  it("extracts all legacy image opportunities without confusing percent with bytes", () => {
    const item = { url: 'hero.png', totalBytes: 1000, wastedBytes: 250, wastedPercent: 25 };
    const result = ResponseParser.extractImageOptimizationData(auditResponse(Object.fromEntries(['uses-responsive-images', 'offscreen-images', 'uses-optimized-images', 'modern-image-formats'].map(id => [id, { details: { items: [item, {}] } }]))));
    for (const items of Object.values(result)) expect(items).toEqual([item, { url: '', totalBytes: 0, wastedBytes: 0, wastedPercent: 0 }]);
  });

  it("handles item-level image insight reasons and zero-size images", () => {
    const result = ResponseParser.extractImageOptimizationData(auditResponse({ 'image-delivery-insight': { details: { items: [
      { url: 'unknown.png', totalBytes: 1000, wastedBytes: 125, reason: 'unknown' },
      { url: 'empty.png', reason: 'lazy', wastedBytes: 0 },
    ] } } }));
    expect(result).toEqual({ responsiveImages: [{ url: 'unknown.png', totalBytes: 1000, wastedBytes: 125, wastedPercent: 13 }], offscreenImages: [{ url: 'empty.png', totalBytes: 0, wastedBytes: 0, wastedPercent: 0 }], unoptimizedImages: [], modernFormats: [] });
  });

  it("extracts legacy render-blocking savings and unmodified dependency chains", () => {
    const chains = { type: 'criticalrequestchain', chains: { root: { request: { url: 'https://x', transferSize: 50 } } } };
    expect(ResponseParser.extractRenderBlockingData(auditResponse({
      'render-blocking-resources': { details: { overallSavingsMs: 1200, items: [{ url: 'style.css', totalBytes: 2048, wastedMs: 600 }, {}] } },
      'critical-request-chains': { details: chains },
    }))).toEqual({ resources: [{ url: 'style.css', totalBytes: 2048, wastedMs: 600 }, { url: '', totalBytes: 0, wastedMs: 0 }], totalWastedMs: 1200, criticalChains: chains });
  });

  it("totals legacy third-party costs without discarding facade guidance", () => {
    const item = { entity: 'Video', transferSize: 2048, blockingTime: 120, mainThreadTime: 200, subItems: { items: [{ url: 'embed.js' }] } };
    expect(ResponseParser.extractThirdPartyData(auditResponse({
      'third-party-summary': { details: { items: [item, {}] } },
      'third-party-facades': { details: { items: [{ product: 'Video embed', transferSize: 2048, blockingTime: 120 }, {}] } },
    }))).toEqual({ summary: [item, { entity: '', transferSize: 0, blockingTime: 0, mainThreadTime: 0 }], totalTransferSize: 2048, totalBlockingTime: 120, facades: [{ product: 'Video embed', transferSize: 2048, blockingTime: 120 }, { product: '', transferSize: 0, blockingTime: 0 }] });
  });

  it("limits category failures to five and excludes missing, passing and unscored audits", () => {
    const response = auditResponse(Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`fail-${i}`, { title: i === 0 ? '' : `Failure ${i}`, score: i / 10, description: `Fix ${i}` }])));
    Object.assign(response.lighthouseResult!.audits, { pass: { score: 1 }, manual: { score: null } });
    response.lighthouseResult!.categories = { 'best-practices': { score: 0.65, auditRefs: ['missing', 'pass', 'manual', ...Array.from({ length: 7 }, (_, i) => `fail-${i}`)].map(id => ({ id })) } } as any;
    expect(ResponseParser.extractOtherCategories(response).bestPractices).toEqual({ score: 0.65, keyAudits: Array.from({ length: 5 }, (_, i) => ({ id: `fail-${i}`, title: i === 0 ? 'fail-0' : `Failure ${i}`, score: i / 10, description: `Fix ${i}` })) });
  });

  it("returns no LCP node when nested discovery lists contain only summary text", () => {
    expect(ResponseParser.extractElementData(auditResponse({
      'lcp-discovery-insight': { details: { items: [{ type: 'list', value: { items: [{ type: 'text', value: 'Summary' }] } }, null] } },
    }))).toEqual({ lcpElement: null, clsElements: [], lazyLoadedLcp: null });
  });

  it("falls back to individual audit values without converting milliseconds or CLS", () => {
    const ids = ['first-contentful-paint', 'largest-contentful-paint', 'cumulative-layout-shift', 'total-blocking-time', 'max-potential-fid', 'speed-index', 'interactive'];
    const values = [1800, 4000, 0.25, 600, 300, 5800, 7000];
    expect(ResponseParser.extractDetailedMetrics(auditResponse(Object.fromEntries(ids.map((id, i) => [id, { numericValue: values[i] }]))))).toEqual({ firstContentfulPaint: 1800, largestContentfulPaint: 4000, cumulativeLayoutShift: 0.25, totalBlockingTime: 600, maxPotentialFID: 300, speedIndex: 5800, timeToInteractive: 7000 });
  });

  it("keeps lab metric units intact and falls back from null aggregate values", () => {
    const response = auditResponse({
      metrics: { details: { items: [{ firstContentfulPaint: null, largestContentfulPaint: 2500, cumulativeLayoutShift: 0.1, totalBlockingTime: 200, maxPotentialFID: 100, speedIndex: 3400, interactive: 5000 }] } },
      'first-contentful-paint': { numericValue: 1800 },
    });
    expect(ResponseParser.extractDetailedMetrics(response)).toEqual({ firstContentfulPaint: 1800, largestContentfulPaint: 2500, cumulativeLayoutShift: 0.1, totalBlockingTime: 200, maxPotentialFID: 100, speedIndex: 3400, timeToInteractive: 5000 });
  });
});

describe("ResponseParser — numeric fidelity", () => {
  it("preserves zero category scores rather than reporting unavailable", () => {
    const response = lighthouse13Response();
    for (const id of ['accessibility', 'seo', 'best-practices', 'pwa']) {
      response.lighthouseResult!.categories[id] = { id, title: id, score: 0, auditRefs: [] };
    }
    expect(ResponseParser.extractOtherCategories(response)).toEqual({
      accessibility: { score: 0, keyAudits: [] }, seo: { score: 0, keyAudits: [] },
      bestPractices: { score: 0, keyAudits: [] }, pwa: { score: 0, keyAudits: [] },
    });
  });

  it("preserves zero aggregate metrics instead of substituting individual audits", () => {
    const response = lighthouse13Response();
    const keys = ['firstContentfulPaint', 'largestContentfulPaint', 'cumulativeLayoutShift', 'totalBlockingTime', 'maxPotentialFID', 'speedIndex', 'interactive'];
    const ids = ['first-contentful-paint', 'largest-contentful-paint', 'cumulative-layout-shift', 'total-blocking-time', 'max-potential-fid', 'speed-index', 'interactive'];
    response.lighthouseResult!.audits = Object.fromEntries(ids.map(id => [id, { numericValue: 999 }])) as any;
    response.lighthouseResult!.audits.metrics = { details: { items: [Object.fromEntries(keys.map(key => [key, 0]))] } } as any;
    expect(ResponseParser.extractDetailedMetrics(response)).toEqual({
      firstContentfulPaint: 0, largestContentfulPaint: 0, cumulativeLayoutShift: 0,
      totalBlockingTime: 0, maxPotentialFID: 0, speedIndex: 0, timeToInteractive: 0,
    });
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
