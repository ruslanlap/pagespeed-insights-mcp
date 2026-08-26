#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "crypto";
import { realpathSync } from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { validateEnv } from "./env.js";
import { getLogger, createRequestLogger } from "./logger.js";
import { PageSpeedClient } from "./pagespeed-client.js";
import { cache } from "./cache.js";
import { PerformanceRecommendationsEngine } from "./recommendations.js";
import { ResponseParser } from "./response-parser.js";
import {
  AnalyzePageSpeedSchema,
  PerformanceSummarySchema,
  CruxSummarySchema,
  OriginCruxSchema,
  CompareUrlsSchema,
  BatchAnalyzeSchema,
  UrlSchema,
  AnalysisReportSchema,
  DiagnoseSchema,
  FieldDataSchema,
  CompareSchema,
  BatchAnalysisSchema,
  type AnalyzePageSpeedInput,
} from "./schemas.js";
import type { PageSpeedInsightsResponse, CruxRecord, ComparisonResult } from "./types.js";
import { getBaseline, saveBaseline, compareBaselines } from "./baselines.js";
import { z } from "zod";
import { V2_TOOLS } from "./tool-definitions.js";

const pkg = createRequire(import.meta.url)("../package.json") as { version: string };
const CHARACTER_LIMIT = 25_000;

export class PageSpeedInsightsServer {
  private server: Server;
  private client: PageSpeedClient;
  private recommendationsEngine: PerformanceRecommendationsEngine;
  private logger = getLogger();

  constructor() {
    // Validate environment first
    validateEnv();
    
    this.server = new Server(
      {
        name: "pagespeed-insights-mcp",
        version: pkg.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.client = new PageSpeedClient();
    this.recommendationsEngine = new PerformanceRecommendationsEngine();
    this.setupTools();
  }

  private setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: V2_TOOLS,
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
      const { name, arguments: args } = request.params;
      const progressToken = (request.params._meta as any | undefined)?.progressToken;

      // Long multirun calls (runs>1 → minutes) time out in most clients.
      // Clients reset their timeout on progress notifications, so when a token
      // is present we beat every 10s regardless — a single PSI call blocks for
      // tens of seconds and no in-loop callback can cover that gap.
      let keepalive: ReturnType<typeof setInterval> | undefined;
      let done = 0;
      const notify = async () => {
        if (progressToken === undefined) return;
        try {
          await extra.sendNotification({
            method: "notifications/progress",
            params: { progressToken, progress: done, total: 100 },
          });
        } catch { /* client gone; the main call will fail anyway */ }
      };
      if (progressToken !== undefined) {
        keepalive = setInterval(() => void notify(), 10_000);
        (globalThis as any).__psiProgress = () => { done++; void notify(); };
      }

      try {
        return await this.dispatchTool(name, args);
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Invalid tool arguments.";
        return this.toolError(`${detail} Review the tool schema and correct the highlighted field.`);
      } finally {
        if (keepalive) clearInterval(keepalive);
        delete (globalThis as any).__psiProgress;
      }
    });
  }

  private async dispatchTool(name: string, args: unknown): Promise<any> {
    const raw = (args && typeof args === "object" ? args : {}) as Record<string, unknown>;
    const { responseFormat = "markdown", ...inputArgs } = raw;
    let result: any;

    switch (name) {
      case "pagespeed_analyze_page": {
        const { categories, ...analysisArgs } = inputArgs;
        const input = AnalysisReportSchema.parse({ ...analysisArgs, category: categories ?? analysisArgs.category });
        const legacy = { ...input, category: input.category };
        result = input.report === "summary" ? await this.handlePerformanceSummary(legacy)
          : input.report === "full" ? await this.handleAnalyzePageSpeed(legacy)
          : input.report === "recommendations" ? await this.handleGetRecommendations(legacy)
          : input.report === "audit" ? await this.handleGetFullAudit({ ...legacy, categories: input.category })
          : await this.handlePerformanceMap(legacy);
        break;
      }
      case "pagespeed_diagnose_page": {
        const input = DiagnoseSchema.parse(inputArgs);
        const handlers = {
          visual: () => this.handleGetVisualAnalysis(input), elements: () => this.handleGetElementAnalysis(input),
          network: () => this.handleGetNetworkAnalysis(input), javascript: () => this.handleGetJavaScriptAnalysis(input),
          images: () => this.handleGetImageOptimizationDetails(input), "render-blocking": () => this.handleGetRenderBlockingDetails(input),
          "third-parties": () => this.handleGetThirdPartyImpact(input),
        };
        result = await handlers[input.focus]();
        break;
      }
      case "pagespeed_get_field_data": {
        const input = FieldDataSchema.parse(inputArgs);
        result = input.scope === "origin"
          ? await this.handleGetOriginCrux({ origin: input.url, formFactor: input.formFactor })
          : await this.handleCruxSummary({ url: input.url, formFactor: input.formFactor });
        break;
      }
      case "pagespeed_compare_pages": {
        const input = CompareSchema.parse(inputArgs);
        result = input.mode === "pages"
          ? await this.handleComparePages({ urlA: input.url, urlB: input.against, strategy: input.strategy, categories: input.categories })
          : await this.handleCompareBaseline({ url: input.url, strategy: input.strategy, runs: input.runs, save_baseline: input.replaceBaseline });
        break;
      }
      case "pagespeed_analyze_batch": {
        const { categories, ...batchArgs } = inputArgs;
        const input = BatchAnalysisSchema.parse({ ...batchArgs, category: categories ?? batchArgs.category });
        result = await this.handleBatchAnalyze({ ...input, category: input.category });
        break;
      }
      case "pagespeed_clear_cache":
        result = await this.handleClearCache();
        break;
      default:
        return this.toolError(`Unknown tool '${name}'. Call tools/list and use one of the pagespeed_* v2 tool names.`);
    }
    return this.toV2Result(name, result, responseFormat);
  }

  private toV2Result(tool: string, result: any, responseFormat: unknown): any {
    const rawText = result.content?.find((item: { type: string }) => item.type === "text")?.text ?? "";
    const truncated = rawText.length > CHARACTER_LIMIT;
    const text = truncated
      ? `${rawText.slice(0, CHARACTER_LIMIT)}\n\n[Truncated at ${CHARACTER_LIMIT} characters. Request a focused diagnostic or a summary report to reduce output.]`
      : rawText;
    let parsed: unknown = text;
    try { parsed = JSON.parse(text); } catch { /* Markdown is the canonical human-readable fallback. */ }
    const structuredContent = {
      tool,
      result: parsed,
      ...(truncated ? { truncated: true, truncationMessage: `Response limited to ${CHARACTER_LIMIT} characters; use a focused diagnostic or summary report.` } : {}),
    };
    return {
      ...result,
      content: [{ type: "text", text: responseFormat === "json" ? JSON.stringify(structuredContent, null, 2) : text }],
      structuredContent,
    };
  }

  private toolError(message: string): { content: Array<{ type: "text"; text: string }>; isError: true } {
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }

  private async handleAnalyzePageSpeed(args: any) {
    const correlationId = randomUUID();
    const logger = createRequestLogger(correlationId, "analyze-page-speed");
    
    try {
      const input = AnalyzePageSpeedSchema.parse(args);
      logger.info({ url: input.url, strategy: input.strategy }, "Starting PageSpeed analysis");
      
      const result = await this.client.analyzePageSpeed(input, correlationId, (globalThis as any).__psiProgress as (() => void) | undefined);
      
      return {
        content: [
          {
            type: "text",
            text: this.formatAnalysisReport(result, input),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error({ error: errorMessage }, "PageSpeed analysis failed");
      return {
        content: [
          {
            type: "text",
            text: `Error analyzing page speed: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handlePerformanceSummary(args: any) {
    const correlationId = randomUUID();
    const logger = createRequestLogger(correlationId, "performance-summary");
    
    try {
      const input = PerformanceSummarySchema.parse(args);
      logger.info({ url: input.url }, "Getting performance summary");
      
      const fullInput: AnalyzePageSpeedInput = {
        ...input,
        category: ["performance"],
        locale: "en",
      };
      
      const result = await this.client.analyzePageSpeed(fullInput, correlationId);
      const summary = this.createPerformanceSummary(result, input);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(summary, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error({ error: errorMessage }, "Performance summary failed");
      return {
        content: [
          {
            type: "text",
            text: `Error getting performance summary: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handlePerformanceMap(args: any) {
    const correlationId = randomUUID();
    const logger = createRequestLogger(correlationId, "performance-map");

    try {
      const input = PerformanceSummarySchema.parse(args);
      logger.info({ url: input.url }, "Generating performance map");

      const fullInput: AnalyzePageSpeedInput = {
        ...input,
        category: ["performance"],
        locale: "en",
      };

      const result = await this.client.analyzePageSpeed(fullInput, correlationId);
      const map = this.createPerformanceMap(result, input);

      return {
        content: [
          {
            type: "text",
            text: map,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error({ error: errorMessage }, "Performance map failed");
      return {
        content: [
          {
            type: "text",
            text: `Error generating performance map: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private createPerformanceMap(data: PageSpeedInsightsResponse, input: { url: string; strategy: string }): string {
    const lighthouse = data.lighthouseResult;
    const performance = lighthouse?.categories?.performance;
    const audits = lighthouse?.audits || {};
    const score = performance?.score != null ? Math.round(performance.score * 100) : null;
    const scoreEmoji = score === null ? "❓" : score >= 90 ? "🟢" : score >= 50 ? "🟠" : "🔴";

    const cwvConfigs = [
      { id: "largest-contentful-paint", label: "LCP", good: 2500, mediocre: 4000, unit: "ms", display: audits["largest-contentful-paint"]?.displayValue },
      { id: "cumulative-layout-shift", label: "CLS", good: 0.1, mediocre: 0.25, unit: "", display: audits["cumulative-layout-shift"]?.displayValue },
      { id: "total-blocking-time", label: "TBT", good: 200, mediocre: 600, unit: "ms", display: audits["total-blocking-time"]?.displayValue },
      { id: "first-contentful-paint", label: "FCP", good: 1800, mediocre: 3000, unit: "ms", display: audits["first-contentful-paint"]?.displayValue },
      { id: "speed-index", label: "SI", good: 3400, mediocre: 5800, unit: "ms", display: audits["speed-index"]?.displayValue },
    ];

    const vitalNodes = cwvConfigs
      .filter(v => audits[v.id]?.numericValue != null)
      .map(v => {
        const num = audits[v.id]!.numericValue!;
        const status = num <= v.good ? "🟢 Good" : num <= v.mediocre ? "🟡 Needs Improvement" : "🔴 Poor";
        const display = v.display || String(num);
        return `  ${v.label}["${v.label}: ${display}<br/>${status}"]`;
      });

    // Top 5 opportunities from Lighthouse audit refs
    const opportunities = performance?.auditRefs
      ?.filter(ref => audits[ref.id]?.details?.type === "opportunity")
      .slice(0, 5)
      .map(ref => {
        const audit = audits[ref.id];
        return `  OPP_${ref.id}["${audit.title}<br/>Save: ${audit.displayValue || "N/A"}"]`;
      }) || [];

    let map = `# Performance Map\n\n`;
    map += `**URL:** ${input.url}\n`;
    map += `**Strategy:** ${input.strategy}\n\n`;
    map += "```mermaid\n";
    map += "graph TD\n";
    map += `  Score["Performance: ${score !== null ? score + "/100" : "N/A"} ${scoreEmoji}"]\n`;

    if (vitalNodes.length > 0) {
      map += "  Score --> Vitals\n";
      map += `  Vitals{{"Core Web Vitals"}}\n`;
      vitalNodes.forEach(n => { map += `  Vitals --> ${n.split('[')[0].trim()}\n`; });
      vitalNodes.forEach(n => { map += n + "\n"; });
    }

    if (opportunities.length > 0) {
      map += "  Score --> Opps\n";
      map += `  Opps{{"Top Opportunities"}}\n`;
      opportunities.forEach(o => { map += `  Opps --> ${o.split('[')[0].trim()}\n`; });
      opportunities.forEach(o => { map += o + "\n"; });
    }

    // Style nodes by status
    map += "\n";
    const styleMap: Record<string, string> = { good: "#4CAF50", mediocre: "#FF9800", poor: "#F44336" };
    const nodesByClass: Record<string, string[]> = { good: [], mediocre: [], poor: [] };
    cwvConfigs.forEach(v => {
      if (audits[v.id]?.numericValue != null) {
        const num = audits[v.id]!.numericValue!;
        const cls = num <= v.good ? "good" : num <= v.mediocre ? "mediocre" : "poor";
        nodesByClass[cls].push(v.label);
      }
    });
    (Object.keys(nodesByClass) as Array<keyof typeof nodesByClass>).forEach(cls => {
      if (nodesByClass[cls].length > 0) {
        map += `  classDef ${cls} fill:${styleMap[cls]},color:#fff\n`;
        map += `  class ${nodesByClass[cls].join(",")} ${cls}\n`;
      }
    });

    map += "```\n";
    return map;
  }

  private async handleCompareBaseline(args: any) {
    const correlationId = randomUUID();
    const logger = createRequestLogger(correlationId, "compare-baseline");

    try {
      const input = z.object({
        url: UrlSchema,
        strategy: z.enum(["mobile", "desktop"]).default("mobile"),
        runs: z.number().int().min(2).max(5).default(3),
        save_baseline: z.boolean().default(false),
      }).parse(args);

      const result = await this.client.analyzePageSpeed(
        { url: input.url, strategy: input.strategy, category: ["performance"], locale: "en", runs: input.runs },
        correlationId,
        (globalThis as any).__psiProgress as (() => void) | undefined
      );
      const mr = (result as any).multirun as
        | { stats: any; scores: Record<string, any>; metrics: Record<string, any> }
        | undefined;
      if (!mr) {
        return {
          content: [{ type: "text", text: "Error: no multirun data — compare_baseline requires runs >= 2." }],
          isError: true,
        };
      }

      const lhVersion = result.lighthouseResult?.lighthouseVersion;
      const existing = getBaseline(input.url, input.strategy);
      let text: string;

      if (!existing || input.save_baseline) {
        const snap = saveBaseline(input.url, input.strategy, mr, lhVersion);
        text = `# Baseline recorded\n\n**URL:** ${input.url} (${input.strategy})\n**Analyses:** ${mr.stats.analyses}/${mr.stats.requested} distinct, ${mr.stats.cachedReplays} replay(s) dropped\n**Recorded:** ${snap.recorded}\n\nNo comparison: nothing to compare against yet. Make your change, then call compare_baseline again.`;
      } else {
        const verdicts = compareBaselines(existing, {
          recorded: new Date().toISOString(),
          lighthouseVersion: lhVersion,
          scores: mr.scores,
          metrics: mr.metrics,
        });
        text = `# Baseline comparison\n\n**URL:** ${input.url} (${input.strategy})\n**Baseline:** ${existing.recorded} | **Now:** ${new Date().toISOString()}\n`;
        if (existing.lighthouseVersion && lhVersion && existing.lighthouseVersion !== lhVersion) {
          text += `\n⚠️ Lighthouse version changed (${existing.lighthouseVersion} → ${lhVersion}); scores move with it even when the page does not.\n`;
        }
        const anyVerdict = verdicts.filter((v) => v.verdict !== "no-verdict");
        if (anyVerdict.length === 0) {
          text += `\n**No verdict available:** all ranges overlap — the difference is inside the instrument's own wobble.\n`;
        }
        text += `\n| Metric | Before | After | Verdict | Guaranteed |\n|---|---|---|---|---|\n`;
        for (const v of verdicts.slice(0, 20)) {
          const fmt = (s: any) => `${Math.round(s.median)} [${Math.round(s.min)}–${Math.round(s.max)}]`;
          text += `| ${v.metric} | ${fmt(v.before)} | ${fmt(v.after)} | ${v.verdict} | ${Math.round(v.guaranteedDelta)} |\n`;
        }
        text += `\n> Savings and ranges do not add up; use the order, not the sum. Quote guaranteed, not median.\n`;
      }

      logger.info({ url: input.url }, "compare_baseline done");
      return { content: [{ type: "text", text }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error({ error: errorMessage }, "compare_baseline failed");
      return {
        content: [{ type: "text", text: `Error comparing baseline: ${errorMessage}` }],
        isError: true,
      };
    }
  }

  private async handleGetOriginCrux(args: any) {
    const correlationId = randomUUID();
    const logger = createRequestLogger(correlationId, "origin-crux");

    try {
      const input = OriginCruxSchema.parse(args);
      logger.info({ origin: input.origin }, "Fetching origin CrUX data");

      const cruxData = await this.client.getOriginCruxData(input, correlationId);
      const summary = this.formatOriginCruxSummary(cruxData, input.origin);
      return {
        content: [
          {
            type: "text",
            text: summary,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error({ error: errorMessage }, "Origin CrUX request failed");
      return {
        content: [
          {
            type: "text",
            text: `Error getting origin CrUX data: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private formatOriginCruxSummary(cruxData: CruxRecord, origin: string): string {
    if (!cruxData.record) {
      return `# CrUX Origin Field Data\n\n**Origin:** ${origin}\n**Status:** No field data available (insufficient traffic)\n\nThis origin doesn't have enough real-world usage data in Chrome UX Report.`;
    }

    const { record } = cruxData;
    let summary = `# CrUX Origin Field Data\n\n`;
    summary += `**Origin:** ${origin}\n`;
    summary += `**Form Factor:** ${record.key.formFactor}\n\n`;

    const cwvMetrics = {
      "largest_contentful_paint": "Largest Contentful Paint",
      "interaction_to_next_paint": "Interaction to Next Paint",
      "cumulative_layout_shift": "Cumulative Layout Shift",
      "experimental_time_to_first_byte": "Time to First Byte",
      "first_contentful_paint": "First Contentful Paint",
    };

    summary += `## Core Web Vitals (Real User Data)\n`;
    Object.entries(cwvMetrics).forEach(([key, title]) => {
      const metric = record.metrics?.[key];
      if (metric) {
        summary += `- **${title}**: ${metric.percentiles.p75}${key === "cumulative_layout_shift" ? "" : "ms"} (p75)\n`;
      }
    });

    return summary;
  }

  private async handleCruxSummary(args: any) {
    const correlationId = randomUUID();
    const logger = createRequestLogger(correlationId, "crux-summary");
    
    try {
      const input = CruxSummarySchema.parse(args);
      logger.info({ url: input.url }, "Getting CrUX summary");
      
      const cruxData = await this.client.getCruxData(input, correlationId);
      const summary = this.formatCruxSummary(cruxData, input.url);
      
      return {
        content: [
          {
            type: "text",
            text: summary,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error({ error: errorMessage }, "CrUX summary failed");
      return {
        content: [
          {
            type: "text",
            text: `Error getting CrUX data: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleComparePages(args: any) {
    const correlationId = randomUUID();
    const logger = createRequestLogger(correlationId, "compare-pages");
    
    try {
      const input = CompareUrlsSchema.parse(args);
      logger.info({ urlA: input.urlA, urlB: input.urlB }, "Comparing pages");
      
      const [resultA, resultB] = await Promise.all([
        this.client.analyzePageSpeed({
          url: input.urlA,
          strategy: input.strategy,
          category: input.categories,
          locale: "en",
        }, correlationId),
        this.client.analyzePageSpeed({
          url: input.urlB, 
          strategy: input.strategy,
          category: input.categories,
          locale: "en",
        }, correlationId),
      ]);
      
      const comparison = this.createComparison(resultA, resultB, input);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(comparison, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error({ error: errorMessage }, "Page comparison failed");
      return {
        content: [
          {
            type: "text",
            text: `Error comparing pages: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleFullReport(args: any) {
    const correlationId = randomUUID();
    const logger = createRequestLogger(correlationId, "full-report");
    
    try {
      const input = AnalyzePageSpeedSchema.parse(args);
      logger.info({ url: input.url }, "Generating full Lab+Field report");
      
      const [psiData, cruxData] = await Promise.allSettled([
        this.client.analyzePageSpeed(input, correlationId),
        this.client.getCruxData({ url: input.url }, correlationId),
      ]);
      
      const report = this.createFullReport(
        psiData.status === "fulfilled" ? psiData.value : null,
        cruxData.status === "fulfilled" ? cruxData.value : null,
        input
      );
      
      return {
        content: [
          {
            type: "text",
            text: report,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error({ error: errorMessage }, "Full report generation failed");
      return {
        content: [
          {
            type: "text",
            text: `Error generating full report: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleBatchAnalyze(args: any) {
    const correlationId = randomUUID();
    const logger = createRequestLogger(correlationId, "batch-analyze");
    
    try {
      const input = BatchAnalyzeSchema.parse(args);
      logger.info({ urlCount: input.urls.length }, "Starting batch analysis");
      
      const results: Array<{ url: string; result?: any; error?: string }> = [];
      
      for (let i = 0; i < input.urls.length; i++) {
        const url = input.urls[i];
        try {
          logger.info({ url, progress: `${i + 1}/${input.urls.length}` }, "Analyzing URL");
          
          const result = await this.client.analyzePageSpeed({
            url,
            strategy: input.strategy,
            category: input.category,
            locale: input.locale,
          }, correlationId);
          
          results.push({ url, result: this.createPerformanceSummary(result, { url, strategy: input.strategy }) });
        } catch (error) {
          const urlErrorMessage = error instanceof Error ? error.message : "Unknown error occurred";
          logger.warn({ url, error: urlErrorMessage }, "URL analysis failed");
          results.push({ url, error: urlErrorMessage });
        }
      }
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              summary: {
                total: input.urls.length,
                successful: results.filter(r => r.result).length,
                failed: results.filter(r => r.error).length,
              },
              results,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error({ error: errorMessage }, "Batch analysis failed");
      return {
        content: [
          {
            type: "text",
            text: `Error in batch analysis: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleClearCache(): Promise<any> {
    const logger = this.logger;
    
    try {
      const sizeBefore = cache.size();
      cache.clear();
      
      logger.info({ clearedEntries: sizeBefore }, "Cache cleared successfully");
      
      return {
        content: [
          {
            type: "text",
            text: `✅ Cache cleared successfully. Removed ${sizeBefore} cached entries.`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error({ error: errorMessage }, "Failed to clear cache");
      
      return {
        content: [
          {
            type: "text",
            text: `❌ Error clearing cache: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetRecommendations(args: any) {
    const correlationId = randomUUID();
    const logger = createRequestLogger(correlationId, "get-recommendations");
    
    try {
      const input = AnalyzePageSpeedSchema.parse(args);
      logger.info({ url: input.url, strategy: input.strategy }, "Generating performance recommendations");
      
      const result = await this.client.analyzePageSpeed(input, correlationId);
      const recommendations = this.recommendationsEngine.generateRecommendations(result);
      const formattedReport = this.recommendationsEngine.formatRecommendations(recommendations);
      
      return {
        content: [
          {
            type: "text",
            text: formattedReport,
          }
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error({ error: errorMessage }, "Recommendations generation failed");
      return {
        content: [
          {
            type: "text",
            text: `Error generating recommendations: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private formatAnalysisReport(data: PageSpeedInsightsResponse, input: AnalyzePageSpeedInput): string {
    const lighthouse = data.lighthouseResult;
    if (!lighthouse) {
      return "No Lighthouse data available in response";
    }

    const performance = lighthouse.categories?.performance;
    const audits = lighthouse.audits;

    let report = `# PageSpeed Insights Analysis\n\n`;
    report += `**URL:** ${input.url}\n`;
    report += `**Strategy:** ${input.strategy}\n`;
    report += `**Analysis Time:** ${data.analysisUTCTimestamp}\n\n`;

    const mr = (data as any).multirun;
    if (mr) {
      report += `## Measurement Confidence (${mr.stats.analyses}/${mr.stats.requested} distinct analyses)\n\n`;
      report += `> Median of ${mr.stats.analyses} genuinely distinct analyses${mr.stats.cachedReplays > 0 ? `, ${mr.stats.cachedReplays} cached replay(s) dropped` : ""}. A single Lighthouse run is noise — treat differences inside the spreads below as no change.\n\n`;
      const perf = mr.scores["performance"];
      if (perf) {
        report += `- **Performance Score**: ${Math.round(perf.median)}/100 (min ${Math.round(perf.min)}, max ${Math.round(perf.max)})\n`;
      }
      report += `\n`;
    }

    if (data.loadingExperience?.metrics) {
      report += `## Field Data (real Chrome users, 28 days)\n\n`;
      for (const [k, v] of Object.entries(data.loadingExperience.metrics)) {
        const m = v as { category?: string; percentile?: Record<string, number> };
        if (m.category) {
          report += `- **${k}**: ${m.category}${m.percentile?.p75 !== undefined ? ` (p75: ${m.percentile.p75})` : ""}\n`;
        }
      }
      report += `\n> Lab (Lighthouse) is a simulation on throttled hardware; field is what real users experienced. They answer different questions — don't merge them.\n\n`;
    }

    if (performance) {
      report += `## Performance Score: ${Math.round(performance.score * 100)}/100\n\n`;
    }

    const desktop = data.desktopResult;
    if (desktop?.lighthouseResult) {
      const dPerf = desktop.lighthouseResult.categories?.performance;
      const dMr = (desktop as any).multirun;
      report += `## Desktop\n\n`;
      if (dMr?.stats) {
        report += `> ${dMr.stats.analyses}/${dMr.stats.requested} distinct analyses; median performance ${Math.round(dMr.scores["performance"]?.median ?? (dPerf ? dPerf.score * 100 : 0))}/100 (min ${Math.round(dMr.scores["performance"]?.min ?? 0)}, max ${Math.round(dMr.scores["performance"]?.max ?? 0)})\n\n`;
      } else if (dPerf) {
        report += `**Performance Score:** ${Math.round(dPerf.score * 100)}/100\n\n`;
      }
    }

    report += `## Core Web Vitals\n`;
    const cwvMetrics = ["largest-contentful-paint", "first-input-delay", "cumulative-layout-shift"];
    cwvMetrics.forEach(metric => {
      const audit = audits?.[metric];
      if (audit) {
        report += `- **${audit.title}**: ${audit.displayValue} ${audit.score === 1 ? "✅" : (audit.score !== null && audit.score >= 0.9) ? "⚠️" : "❌"}\n`;
      }
    });

    report += `\n## Key Metrics\n`;
    const keyMetrics = ["first-contentful-paint", "speed-index", "total-blocking-time"];
    keyMetrics.forEach(metric => {
      const audit = audits?.[metric];
      if (audit) {
        report += `- **${audit.title}**: ${audit.displayValue}\n`;
      }
    });

    if (performance?.auditRefs) {
      const opportunities = performance.auditRefs
        .filter(ref => audits?.[ref.id]?.details?.type === "opportunity")
        .slice(0, 5);
      
      if (opportunities.length > 0) {
        report += `\n## Top Opportunities\n`;
        opportunities.forEach(ref => {
          const audit = audits?.[ref.id];
          if (audit) {
            report += `- **${audit.title}**: ${audit.displayValue || "See details"}\n`;
          }
        });
      }
    }

    return report;
  }

  private createPerformanceSummary(data: PageSpeedInsightsResponse, input: { url: string; strategy: string }) {
    const lighthouse = data.lighthouseResult;
    const performance = lighthouse?.categories?.performance;
    const audits = lighthouse?.audits;

    return {
      url: input.url,
      strategy: input.strategy,
      timestamp: data.analysisUTCTimestamp,
      performance: {
        score: performance?.score ? Math.round(performance.score * 100) : null,
        metrics: {
          firstContentfulPaint: audits?.["first-contentful-paint"]?.displayValue,
          largestContentfulPaint: audits?.["largest-contentful-paint"]?.displayValue,
          cumulativeLayoutShift: audits?.["cumulative-layout-shift"]?.displayValue,
          speedIndex: audits?.["speed-index"]?.displayValue,
          totalBlockingTime: audits?.["total-blocking-time"]?.displayValue,
          firstInputDelay: audits?.["max-potential-fid"]?.displayValue,
        },
      },
      opportunities: performance?.auditRefs
        ?.filter(ref => audits?.[ref.id]?.details?.type === "opportunity")
        ?.map(ref => ({
          id: ref.id,
          title: audits?.[ref.id]?.title,
          description: audits?.[ref.id]?.description,
          score: audits?.[ref.id]?.score,
          displayValue: audits?.[ref.id]?.displayValue,
        }))
        ?.slice(0, 5) || [],
    };
  }

  private formatCruxSummary(cruxData: CruxRecord, url: string): string {
    if (!cruxData.record) {
      return `# CrUX Field Data\n\n**URL:** ${url}\n**Status:** No field data available (insufficient traffic)\n\nThis URL doesn't have enough real-world usage data in Chrome UX Report.`;
    }

    const { record } = cruxData;
    let summary = `# CrUX Field Data Summary\n\n`;
    summary += `**URL:** ${url}\n`;
    summary += `**Form Factor:** ${record.key.formFactor}\n\n`;

    const cwvMetrics = {
        "largest_contentful_paint": "Largest Contentful Paint",
        "interaction_to_next_paint": "Interaction to Next Paint",
        "cumulative_layout_shift": "Cumulative Layout Shift",
        "experimental_time_to_first_byte": "Time to First Byte",
        "first_contentful_paint": "First Contentful Paint",
    };

    summary += `## Core Web Vitals (Real User Data)\n`;
    Object.entries(cwvMetrics).forEach(([key, title]) => {
      const metric = record.metrics?.[key];
      if (metric) {
        summary += `- **${title}**: ${metric.percentiles.p75}${key === "cumulative_layout_shift" ? "" : "ms"} (p75)\n`;
      }
    });

    return summary;
  }

  private createComparison(resultA: PageSpeedInsightsResponse, resultB: PageSpeedInsightsResponse, input: { urlA: string; urlB: string; strategy: string; categories?: string[] }): ComparisonResult {
    const scoreA = resultA.lighthouseResult?.categories?.performance?.score || 0;
    const scoreB = resultB.lighthouseResult?.categories?.performance?.score || 0;
    
    const auditsA = resultA.lighthouseResult?.audits || {};
    const auditsB = resultB.lighthouseResult?.audits || {};
    
    const keyMetrics = ["largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift"];
    const metrics: any = {};
    
    keyMetrics.forEach(metric => {
      const auditA = auditsA[metric];
      const auditB = auditsB[metric];
      
      if (auditA && auditB) {
        metrics[metric] = {
          urlA: auditA.displayValue,
          urlB: auditB.displayValue,
          better: (auditA.score !== null && auditB.score !== null && auditA.score > auditB.score) ? 'A' : 
                  (auditA.score !== null && auditB.score !== null && auditA.score < auditB.score) ? 'B' : 'tie',
        };
      }
    });

    return {
      urlA: input.urlA,
      urlB: input.urlB,
      strategy: input.strategy,
      comparison: {
        scores: {
          urlA: Math.round(scoreA * 100),
          urlB: Math.round(scoreB * 100),
          difference: Math.round((scoreA - scoreB) * 100),
        },
        metrics,
      },
    };
  }

  private createFullReport(psiData: PageSpeedInsightsResponse | null, cruxData: CruxRecord | null, input: AnalyzePageSpeedInput): string {
    let report = `# Full Performance Report (Lab + Field)\n\n`;
    report += `**URL:** ${input.url}\n`;
    report += `**Strategy:** ${input.strategy}\n\n`;

    if (psiData) {
      report += this.formatAnalysisReport(psiData, input);
      report += `\n\n---\n\n`;
    }

    if (cruxData) {
      report += this.formatCruxSummary(cruxData, input.url);
    } else {
      report += `## Real User Experience (CrUX)\nNo field data available for this URL.\n`;
    }

    if (psiData && cruxData?.record) {
      report += `\n\n## Lab vs Field Comparison\n`;
      report += `Lab data represents controlled testing conditions, while field data shows real user experiences.\n`;
    }

    return report;
  }

  private async handleGetVisualAnalysis(args: any) {
    const correlationId = randomUUID();
    const logger = createRequestLogger(correlationId, "get-visual-analysis");
    
    try {
      const input = { url: args.url, strategy: args.strategy || 'mobile' };
      logger.info({ url: input.url, strategy: input.strategy }, "Getting visual analysis");
      
      const result = await this.client.analyzePageSpeed({
        ...input,
        category: ["performance"],
        locale: "en",
      }, correlationId);
      
      const visualData = ResponseParser.extractVisualData(result);
      
      let report = `# Visual Analysis\n\n`;
      report += `**URL:** ${input.url}\n`;
      report += `**Strategy:** ${input.strategy}\n\n`;
      
      if (visualData.finalScreenshot) {
        report += `## Final Screenshot\n`;
        report += `- Resolution: ${visualData.finalScreenshot.width}x${visualData.finalScreenshot.height}\n`;
        report += `- [Base64 data available in JSON]\n\n`;
      }
      
      if (visualData.filmstrip.length > 0) {
        report += `## Loading Filmstrip\n`;
        report += `Found ${visualData.filmstrip.length} frames showing page load progression:\n`;
        visualData.filmstrip.forEach((frame, index) => {
          report += `- Frame ${index + 1}: ${frame.timing}ms\n`;
        });
        report += `\n`;
      }
      
      if (visualData.fullPageScreenshot) {
        report += `## Full Page Screenshot\n`;
        report += `- Full page dimensions: ${visualData.fullPageScreenshot.screenshot.width}x${visualData.fullPageScreenshot.screenshot.height}\n`;
        report += `- Contains ${Object.keys(visualData.fullPageScreenshot.nodes || {}).length} mapped DOM nodes\n`;
      }
      
      return {
        content: [
          {
            type: "text",
            text: report,
          }
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error({ error: errorMessage }, "Visual analysis failed");
      return {
        content: [
          {
            type: "text",
            text: `Error getting visual analysis: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetElementAnalysis(args: any) {
    const correlationId = randomUUID();
    const logger = createRequestLogger(correlationId, "get-element-analysis");
    
    try {
      const input = { url: args.url, strategy: args.strategy || 'mobile' };
      logger.info({ url: input.url, strategy: input.strategy }, "Getting element analysis");
      
      const result = await this.client.analyzePageSpeed({
        ...input,
        category: ["performance"],
        locale: "en",
      }, correlationId);
      
      const elementData = ResponseParser.extractElementData(result);
      
      let report = `# Element-Level Performance Analysis\n\n`;
      report += `**URL:** ${input.url}\n`;
      report += `**Strategy:** ${input.strategy}\n\n`;
      
      if (elementData.lcpElement) {
        report += `## Largest Contentful Paint (LCP) Element\n`;
        report += `- **Selector:** \`${elementData.lcpElement.selector}\`\n`;
        report += `- **HTML:** \`${elementData.lcpElement.snippet}\`\n`;
        if (elementData.lcpElement.boundingRect) {
          const rect = elementData.lcpElement.boundingRect;
          report += `- **Position:** top: ${rect.top}px, left: ${rect.left}px\n`;
          report += `- **Size:** ${rect.width}x${rect.height}px\n`;
        }
        report += `\n`;
      }
      
      if (elementData.clsElements.length > 0) {
        report += `## Layout Shift Elements (CLS)\n`;
        report += `Found ${elementData.clsElements.length} elements causing layout shifts:\n\n`;
        elementData.clsElements.forEach((item, index) => {
          report += `### Element ${index + 1} (Shift score: ${item.score.toFixed(3)})\n`;
          report += `- **Selector:** \`${item.node.selector}\`\n`;
          report += `- **HTML:** \`${item.node.snippet}\`\n\n`;
        });
      }
      
      if (elementData.lazyLoadedLcp) {
        report += `## ⚠️ LCP Element is Lazy-Loaded\n`;
        report += `The LCP element is using lazy loading, which can hurt performance:\n`;
        report += `- **Selector:** \`${elementData.lazyLoadedLcp.selector}\`\n`;
        report += `- **Recommendation:** Remove lazy loading from above-the-fold images\n`;
      }
      
      return {
        content: [
          {
            type: "text",
            text: report,
          }
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error({ error: errorMessage }, "Element analysis failed");
      return {
        content: [
          {
            type: "text",
            text: `Error getting element analysis: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetNetworkAnalysis(args: any) {
    const correlationId = randomUUID();
    const logger = createRequestLogger(correlationId, "get-network-analysis");
    
    try {
      const input = { url: args.url, strategy: args.strategy || 'mobile' };
      logger.info({ url: input.url, strategy: input.strategy }, "Getting network analysis");
      
      const result = await this.client.analyzePageSpeed({
        ...input,
        category: ["performance"],
        locale: "en",
      }, correlationId);
      
      const networkData = ResponseParser.extractNetworkData(result);
      
      let report = `# Network Waterfall Analysis\n\n`;
      report += `**URL:** ${input.url}\n`;
      report += `**Strategy:** ${input.strategy}\n\n`;
      
      report += `## Summary\n`;
      report += `- **Total Requests:** ${networkData.requestCount}\n`;
      report += `- **Total Transfer Size:** ${(networkData.totalByteWeight / 1024 / 1024).toFixed(2)} MB\n`;
      if (networkData.rtt !== null) {
        report += `- **Network RTT:** ${networkData.rtt}ms\n`;
      }
      if (networkData.serverLatency !== null) {
        report += `- **Server Latency:** ${networkData.serverLatency}ms\n`;
      }
      report += `\n`;
      
      if (networkData.resourceSummary.length > 0) {
        report += `## Resource Breakdown\n`;
        networkData.resourceSummary.forEach(summary => {
          const sizeMB = (summary.size / 1024 / 1024).toFixed(2);
          report += `- **${summary.resourceType}:** ${summary.count} requests, ${sizeMB} MB\n`;
        });
        report += `\n`;
      }
      
      if (networkData.requests.length > 0) {
        report += `## Top 10 Largest Resources\n`;
        const sortedRequests = [...networkData.requests]
          .sort((a, b) => b.transferSize - a.transferSize)
          .slice(0, 10);
          
        sortedRequests.forEach((req, index) => {
          const sizeKB = (req.transferSize / 1024).toFixed(1);
          const duration = req.endTime - req.startTime;
          report += `${index + 1}. **${req.url.split('/').pop() || 'index'}** (${req.resourceType})\n`;
          report += `   - Size: ${sizeKB} KB\n`;
          report += `   - Duration: ${duration.toFixed(0)}ms\n`;
          report += `   - Priority: ${req.priority || 'Medium'}\n\n`;
        });
      }
      
      return {
        content: [
          {
            type: "text",
            text: report,
          }
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error({ error: errorMessage }, "Network analysis failed");
      return {
        content: [
          {
            type: "text",
            text: `Error getting network analysis: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetJavaScriptAnalysis(args: any) {
    const correlationId = randomUUID();
    const logger = createRequestLogger(correlationId, "get-javascript-analysis");
    
    try {
      const input = { url: args.url, strategy: args.strategy || 'mobile' };
      logger.info({ url: input.url, strategy: input.strategy }, "Getting JavaScript analysis");
      
      const result = await this.client.analyzePageSpeed({
        ...input,
        category: ["performance"],
        locale: "en",
      }, correlationId);
      
      const jsData = ResponseParser.extractJavaScriptData(result);
      
      let report = `# JavaScript Execution Analysis\n\n`;
      report += `**URL:** ${input.url}\n`;
      report += `**Strategy:** ${input.strategy}\n\n`;
      
      if (jsData.bootupTime.length > 0) {
        report += `## JavaScript Bootup Time\n`;
        const totalTime = jsData.bootupTime.reduce((sum, item) => sum + item.total, 0);
        report += `**Total JS Execution Time:** ${totalTime.toFixed(0)}ms\n\n`;
        
        const topScripts = jsData.bootupTime
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
          
        report += `### Top 5 Slowest Scripts\n`;
        topScripts.forEach((script, index) => {
          report += `${index + 1}. **${script.url.split('/').pop() || 'inline'}**\n`;
          report += `   - Total: ${script.total.toFixed(0)}ms\n`;
          report += `   - Script Evaluation: ${script.scripting.toFixed(0)}ms\n`;
          report += `   - Parse & Compile: ${script.scriptParseCompile.toFixed(0)}ms\n\n`;
        });
      }
      
      if (jsData.mainThreadWork.length > 0) {
        report += `## Main Thread Work Breakdown\n`;
        const sortedWork = jsData.mainThreadWork.sort((a, b) => b.duration - a.duration);
        sortedWork.forEach(work => {
          const percentage = (work.duration / sortedWork.reduce((sum, w) => sum + w.duration, 0) * 100).toFixed(1);
          report += `- **${work.groupLabel}:** ${work.duration.toFixed(0)}ms (${percentage}%)\n`;
        });
        report += `\n`;
      }
      
      if (jsData.unusedJavaScript.length > 0) {
        report += `## Unused JavaScript\n`;
        const totalWasted = jsData.unusedJavaScript.reduce((sum, item) => sum + item.wastedBytes, 0);
        report += `**Total Unused:** ${(totalWasted / 1024).toFixed(1)} KB\n\n`;
        
        jsData.unusedJavaScript
          .sort((a, b) => b.wastedBytes - a.wastedBytes)
          .slice(0, 5)
          .forEach((item, index) => {
            report += `${index + 1}. **${item.url.split('/').pop() || 'bundle'}**\n`;
            report += `   - Unused: ${(item.wastedBytes / 1024).toFixed(1)} KB (${item.wastedPercent.toFixed(0)}%)\n`;
            report += `   - Total size: ${(item.totalBytes / 1024).toFixed(1)} KB\n\n`;
          });
      }
      
      if (jsData.duplicatedJavaScript.length > 0) {
        report += `## Duplicated JavaScript\n`;
        report += `Found ${jsData.duplicatedJavaScript.length} duplicated modules:\n`;
        jsData.duplicatedJavaScript.forEach(item => {
          report += `- **${item.source}:** ${(item.wastedBytes / 1024).toFixed(1)} KB wasted\n`;
        });
      }

      if (jsData.legacyJavaScript?.length > 0) {
        report += `## Legacy JavaScript\n`;
        report += `Found ${jsData.legacyJavaScript.length} legacy/polyfill modules:\n`;
        jsData.legacyJavaScript.forEach(item => {
          report += `- **${item.source}:** ${(item.wastedBytes / 1024).toFixed(1)} KB wasted\n`;
        });
      }
      
      return {
        content: [
          {
            type: "text",
            text: report,
          }
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error({ error: errorMessage }, "JavaScript analysis failed");
      return {
        content: [
          {
            type: "text",
            text: `Error getting JavaScript analysis: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetImageOptimizationDetails(args: any) {
    const correlationId = randomUUID();
    const logger = createRequestLogger(correlationId, "get-image-optimization");
    
    try {
      const input = { url: args.url, strategy: args.strategy || 'mobile' };
      logger.info({ url: input.url, strategy: input.strategy }, "Getting image optimization details");
      
      const result = await this.client.analyzePageSpeed({
        ...input,
        category: ["performance"],
        locale: "en",
      }, correlationId);
      
      const imageData = ResponseParser.extractImageOptimizationData(result);
      
      let report = `# Image Optimization Details\n\n`;
      report += `**URL:** ${input.url}\n`;
      report += `**Strategy:** ${input.strategy}\n\n`;
      
      let totalSavings = 0;
      
      if (imageData.responsiveImages.length > 0) {
        report += `## Improperly Sized Images\n`;
        imageData.responsiveImages.forEach(img => {
          totalSavings += img.wastedBytes;
          report += `- **${img.url.split('/').pop()}**\n`;
          report += `  - Could save: ${(img.wastedBytes / 1024).toFixed(1)} KB (${img.wastedPercent.toFixed(0)}%)\n`;
          if (img.node) {
            report += `  - Element: \`${img.node.selector}\`\n`;
          }
          report += `\n`;
        });
      }
      
      if (imageData.offscreenImages.length > 0) {
        report += `## Offscreen Images (Should be lazy-loaded)\n`;
        imageData.offscreenImages.forEach(img => {
          totalSavings += img.wastedBytes;
          report += `- **${img.url.split('/').pop()}**\n`;
          report += `  - Size: ${(img.totalBytes / 1024).toFixed(1)} KB\n`;
          report += `  - Not visible on initial load\n\n`;
        });
      }
      
      if (imageData.unoptimizedImages.length > 0) {
        report += `## Unoptimized Images\n`;
        imageData.unoptimizedImages.forEach(img => {
          totalSavings += img.wastedBytes;
          report += `- **${img.url.split('/').pop()}**\n`;
          report += `  - Could save: ${(img.wastedBytes / 1024).toFixed(1)} KB through better compression\n\n`;
        });
      }
      
      if (imageData.modernFormats.length > 0) {
        report += `## Images Not Using Modern Formats\n`;
        report += `Consider WebP or AVIF formats for these images:\n`;
        imageData.modernFormats.forEach(img => {
          totalSavings += img.wastedBytes;
          report += `- **${img.url.split('/').pop()}**\n`;
          report += `  - Could save: ${(img.wastedBytes / 1024).toFixed(1)} KB with WebP\n\n`;
        });
      }
      
      report += `## Total Potential Savings\n`;
      report += `**${(totalSavings / 1024 / 1024).toFixed(2)} MB** could be saved through image optimization\n`;
      
      return {
        content: [
          {
            type: "text",
            text: report,
          }
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error({ error: errorMessage }, "Image optimization analysis failed");
      return {
        content: [
          {
            type: "text",
            text: `Error getting image optimization details: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetRenderBlockingDetails(args: any) {
    const correlationId = randomUUID();
    const logger = createRequestLogger(correlationId, "get-render-blocking");
    
    try {
      const input = { url: args.url, strategy: args.strategy || 'mobile' };
      logger.info({ url: input.url, strategy: input.strategy }, "Getting render-blocking details");
      
      const result = await this.client.analyzePageSpeed({
        ...input,
        category: ["performance"],
        locale: "en",
      }, correlationId);
      
      const renderBlockingData = ResponseParser.extractRenderBlockingData(result);
      
      let report = `# Render-Blocking Resources Analysis\n\n`;
      report += `**URL:** ${input.url}\n`;
      report += `**Strategy:** ${input.strategy}\n\n`;
      
      if (renderBlockingData.resources.length > 0) {
        report += `## Render-Blocking Resources\n`;
        report += `Found ${renderBlockingData.resources.length} render-blocking resources\n`;
        report += `**Total delay:** ${renderBlockingData.totalWastedMs}ms\n\n`;
        
        renderBlockingData.resources.forEach((resource, index) => {
          const fileType = resource.url.endsWith('.css') ? 'CSS' : 'JavaScript';
          report += `${index + 1}. **${resource.url.split('/').pop()}** (${fileType})\n`;
          report += `   - Size: ${(resource.totalBytes / 1024).toFixed(1)} KB\n`;
          report += `   - Blocking time: ${resource.wastedMs}ms\n\n`;
        });
        
        report += `### How to Fix\n`;
        report += `- For CSS: Inline critical CSS and defer non-critical styles\n`;
        report += `- For JavaScript: Use \`async\` or \`defer\` attributes\n`;
        report += `- Consider using resource hints like \`preconnect\` and \`dns-prefetch\`\n\n`;
      } else {
        report += `✅ No render-blocking resources found!\n\n`;
      }
      
      if (renderBlockingData.criticalChains?.chains) {
        report += `## Critical Request Chains\n`;
        report += `Shows the loading dependency graph of resources\n\n`;
        
        if (renderBlockingData.criticalChains.longestChain) {
          const chain = renderBlockingData.criticalChains.longestChain;
          report += `**Longest chain:**\n`;
          report += `- Length: ${chain.length} requests\n`;
          report += `- Duration: ${chain.duration.toFixed(0)}ms\n`;
          report += `- Size: ${(chain.transferSize / 1024).toFixed(1)} KB\n`;
        }
      }
      
      return {
        content: [
          {
            type: "text",
            text: report,
          }
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error({ error: errorMessage }, "Render-blocking analysis failed");
      return {
        content: [
          {
            type: "text",
            text: `Error getting render-blocking details: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetThirdPartyImpact(args: any) {
    const correlationId = randomUUID();
    const logger = createRequestLogger(correlationId, "get-third-party");
    
    try {
      const input = { url: args.url, strategy: args.strategy || 'mobile' };
      logger.info({ url: input.url, strategy: input.strategy }, "Getting third-party impact");
      
      const result = await this.client.analyzePageSpeed({
        ...input,
        category: ["performance"],
        locale: "en",
      }, correlationId);
      
      const thirdPartyData = ResponseParser.extractThirdPartyData(result);
      
      let report = `# Third-Party Impact Analysis\n\n`;
      report += `**URL:** ${input.url}\n`;
      report += `**Strategy:** ${input.strategy}\n\n`;
      
      if (thirdPartyData.summary.length > 0) {
        report += `## Summary\n`;
        report += `- **Total third-party size:** ${(thirdPartyData.totalTransferSize / 1024 / 1024).toFixed(2)} MB\n`;
        report += `- **Total blocking time:** ${thirdPartyData.totalBlockingTime}ms\n`;
        report += `- **Third-party providers:** ${thirdPartyData.summary.length}\n\n`;
        
        report += `## Impact by Provider\n`;
        thirdPartyData.summary
          .sort((a, b) => b.blockingTime - a.blockingTime)
          .forEach((provider, index) => {
            report += `### ${index + 1}. ${provider.entity}\n`;
            report += `- **Transfer size:** ${(provider.transferSize / 1024).toFixed(1)} KB\n`;
            report += `- **Blocking time:** ${provider.blockingTime}ms\n`;
            report += `- **Main thread time:** ${provider.mainThreadTime}ms\n`;
            
            if (provider.subItems?.items && provider.subItems.items.length > 0) {
              report += `- **Resources:**\n`;
              provider.subItems.items.slice(0, 3).forEach(resource => {
                const filename = resource.url.split('/').pop() || resource.url.split('/')[2];
                report += `  - ${filename}: ${(resource.transferSize / 1024).toFixed(1)} KB\n`;
              });
            }
            report += `\n`;
          });
      } else {
        report += `✅ No significant third-party impact detected!\n\n`;
      }
      
      if (thirdPartyData.facades.length > 0) {
        report += `## Recommended Facades\n`;
        report += `These third-party embeds can be replaced with lightweight facades:\n`;
        thirdPartyData.facades.forEach(facade => {
          report += `- **${facade.product}**: Could save ${(facade.transferSize / 1024).toFixed(1)} KB\n`;
        });
        report += `\nFacades load third-party content only when users interact with them.\n`;
      }
      
      return {
        content: [
          {
            type: "text",
            text: report,
          }
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error({ error: errorMessage }, "Third-party analysis failed");
      return {
        content: [
          {
            type: "text",
            text: `Error getting third-party impact: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetFullAudit(args: any) {
    const correlationId = randomUUID();
    const logger = createRequestLogger(correlationId, "get-full-audit");
    
    try {
      const input = { 
        url: args.url, 
        strategy: args.strategy || 'mobile',
        categories: args.categories || ["performance", "accessibility", "best-practices", "seo"]
      };
      logger.info({ url: input.url, strategy: input.strategy }, "Getting full audit");
      
      const result = await this.client.analyzePageSpeed({
        url: input.url,
        strategy: input.strategy,
        category: input.categories,
        locale: "en",
      }, correlationId);
      
      const categoryData = ResponseParser.extractOtherCategories(result);
      const detailedMetrics = ResponseParser.extractDetailedMetrics(result);
      
      let report = `# Full Lighthouse Audit\n\n`;
      report += `**URL:** ${input.url}\n`;
      report += `**Strategy:** ${input.strategy}\n\n`;
      
      report += `## Scores Overview\n`;
      Object.entries(categoryData).forEach(([category, data]) => {
        if (data.score !== null) {
          const score = Math.round(data.score * 100);
          const emoji = score >= 90 ? '🟢' : score >= 50 ? '🟠' : '🔴';
          report += `- **${category.charAt(0).toUpperCase() + category.slice(1)}:** ${emoji} ${score}/100\n`;
        }
      });
      report += `\n`;
      
      report += `## Detailed Metrics\n`;
      report += `### Core Web Vitals\n`;
      report += `- **LCP:** ${detailedMetrics.largestContentfulPaint ? (detailedMetrics.largestContentfulPaint / 1000).toFixed(2) + 's' : 'N/A'}\n`;
      report += `- **FID:** ${detailedMetrics.maxPotentialFID ? detailedMetrics.maxPotentialFID + 'ms' : 'N/A'}\n`;
      report += `- **CLS:** ${detailedMetrics.cumulativeLayoutShift?.toFixed(3) || 'N/A'}\n\n`;
      
      report += `### Other Key Metrics\n`;
      report += `- **FCP:** ${detailedMetrics.firstContentfulPaint ? (detailedMetrics.firstContentfulPaint / 1000).toFixed(2) + 's' : 'N/A'}\n`;
      report += `- **Speed Index:** ${detailedMetrics.speedIndex ? (detailedMetrics.speedIndex / 1000).toFixed(2) + 's' : 'N/A'}\n`;
      report += `- **TBT:** ${detailedMetrics.totalBlockingTime ? detailedMetrics.totalBlockingTime + 'ms' : 'N/A'}\n`;
      report += `- **TTI:** ${detailedMetrics.timeToInteractive ? (detailedMetrics.timeToInteractive / 1000).toFixed(2) + 's' : 'N/A'}\n\n`;
      
      // Key failing audits for each category
      Object.entries(categoryData).forEach(([category, data]) => {
        if (data.keyAudits.length > 0) {
          report += `## ${category.charAt(0).toUpperCase() + category.slice(1)} Issues\n`;
          data.keyAudits.forEach(audit => {
            const score = audit.score !== null ? Math.round(audit.score * 100) : 0;
            report += `- **${audit.title}** (Score: ${score}/100)\n`;
            if (audit.description) {
              report += `  ${audit.description.split('.')[0]}.\n`;
            }
          });
          report += `\n`;
        }
      });
      
      // Stack packs (framework-specific advice)
      const stackPacks = result.lighthouseResult?.stackPacks;
      if (stackPacks && stackPacks.length > 0) {
        report += `## Framework-Specific Advice\n`;
        stackPacks.forEach(pack => {
          report += `Detected **${pack.title}** - framework-specific optimizations available in detailed data.\n`;
        });
      }
      
      return {
        content: [
          {
            type: "text",
            text: report,
          }
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error({ error: errorMessage }, "Full audit failed");
      return {
        content: [
          {
            type: "text",
            text: `Error getting full audit: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info("PageSpeed Insights MCP server started");
  }
}

// Only auto-start when this file is the process entry point. When imported
// by tests the autostart is skipped, so the suite can construct the server
// without a real stdio transport hanging around.
export function isProcessEntrypoint(moduleUrl: string, argv1?: string): boolean {
  if (!argv1) return false;
  try {
    return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(argv1);
  } catch {
    return false;
  }
}

const isMain = isProcessEntrypoint(import.meta.url, process.argv[1]);

if (isMain) {
  const server = new PageSpeedInsightsServer();
  server.start().catch((error) => {
    console.error("Server failed to start:", error);
    process.exit(1);
  });
}
