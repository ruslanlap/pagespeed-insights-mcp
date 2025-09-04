#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "crypto";
import { validateEnv } from "./env.js";
import { getLogger, createRequestLogger } from "./logger.js";
import { PageSpeedClient } from "./pagespeed-client.js";
import {
  AnalyzePageSpeedSchema,
  PerformanceSummarySchema,
  CruxSummarySchema,
  CompareUrlsSchema,
  BatchAnalyzeSchema,
  type AnalyzePageSpeedInput,
} from "./schemas.js";
import type { PageSpeedInsightsResponse, CruxRecord, ComparisonResult } from "./types.js";

class PageSpeedInsightsServer {
  private server: Server;
  private client: PageSpeedClient;
  private logger = getLogger();

  constructor() {
    // Validate environment first
    validateEnv();
    
    this.server = new Server(
      {
        name: "pagespeed-insights-mcp",
        version: "1.0.1",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.client = new PageSpeedClient();
    this.setupTools();
  }

  private setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "analyze_page_speed",
            description: "Run comprehensive Google PageSpeed Insights analysis with Lighthouse metrics",
            inputSchema: {
              type: "object",
              properties: {
                url: { type: "string", format: "uri", description: "The URL to analyze" },
                strategy: { 
                  type: "string", 
                  enum: ["mobile", "desktop"], 
                  default: "mobile",
                  description: "Analysis strategy" 
                },
                category: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: ["performance", "accessibility", "best-practices", "seo", "pwa"]
                  },
                  default: ["performance"],
                  description: "Categories to analyze"
                },
                locale: { 
                  type: "string", 
                  default: "en",
                  description: "Locale for results" 
                }
              },
              required: ["url"]
            },
          },
          {
            name: "get_performance_summary",
            description: "Get simplified performance metrics and opportunities for a webpage",
            inputSchema: {
              type: "object",
              properties: {
                url: { type: "string", format: "uri", description: "The URL to analyze" },
                strategy: { 
                  type: "string", 
                  enum: ["mobile", "desktop"], 
                  default: "mobile",
                  description: "Analysis strategy" 
                }
              },
              required: ["url"]
            },
          },
          {
            name: "crux_summary",
            description: "Get Chrome User Experience Report real-world field data for Core Web Vitals",
            inputSchema: {
              type: "object",
              properties: {
                url: { type: "string", format: "uri", description: "The URL to analyze" },
                formFactor: {
                  type: "string",
                  enum: ["PHONE", "DESKTOP", "TABLET"],
                  description: "Form factor for CrUX data"
                }
              },
              required: ["url"]
            },
          },
          {
            name: "compare_pages",
            description: "Compare performance metrics between two URLs side-by-side",
            inputSchema: {
              type: "object",
              properties: {
                urlA: { type: "string", format: "uri", description: "First URL to compare" },
                urlB: { type: "string", format: "uri", description: "Second URL to compare" },
                strategy: { 
                  type: "string", 
                  enum: ["mobile", "desktop"], 
                  default: "mobile",
                  description: "Analysis strategy" 
                },
                categories: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: ["performance", "accessibility", "best-practices", "seo", "pwa"]
                  },
                  default: ["performance"],
                  description: "Categories to compare"
                }
              },
              required: ["urlA", "urlB"]
            },
          },
          {
            name: "full_report",
            description: "Unified report combining Lighthouse lab data with CrUX field data",
            inputSchema: {
              type: "object",
              properties: {
                url: { type: "string", format: "uri", description: "The URL to analyze" },
                strategy: { 
                  type: "string", 
                  enum: ["mobile", "desktop"], 
                  default: "mobile",
                  description: "Analysis strategy" 
                },
                category: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: ["performance", "accessibility", "best-practices", "seo", "pwa"]
                  },
                  default: ["performance"],
                  description: "Categories to analyze"
                },
                locale: { 
                  type: "string", 
                  default: "en",
                  description: "Locale for results" 
                }
              },
              required: ["url"]
            },
          },
          {
            name: "batch_analyze",
            description: "Analyze performance for multiple URLs with progress tracking",
            inputSchema: {
              type: "object",
              properties: {
                urls: {
                  type: "array",
                  items: { type: "string", format: "uri" },
                  minItems: 1,
                  maxItems: 10,
                  description: "URLs to analyze (max 10)"
                },
                strategy: { 
                  type: "string", 
                  enum: ["mobile", "desktop"], 
                  default: "mobile",
                  description: "Analysis strategy" 
                },
                category: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: ["performance", "accessibility", "best-practices", "seo", "pwa"]
                  },
                  default: ["performance"],
                  description: "Categories to analyze"
                },
                locale: { 
                  type: "string", 
                  default: "en",
                  description: "Locale for results" 
                }
              },
              required: ["urls"]
            },
          },
        ] satisfies Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "analyze_page_speed":
          return await this.handleAnalyzePageSpeed(args);
        case "get_performance_summary":
          return await this.handlePerformanceSummary(args);
        case "crux_summary":
          return await this.handleCruxSummary(args);
        case "compare_pages":
          return await this.handleComparePages(args);
        case "full_report":
          return await this.handleFullReport(args);
        case "batch_analyze":
          return await this.handleBatchAnalyze(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async handleAnalyzePageSpeed(args: any) {
    const correlationId = randomUUID();
    const logger = createRequestLogger(correlationId, "analyze-page-speed");
    
    try {
      const input = AnalyzePageSpeedSchema.parse(args);
      logger.info({ url: input.url, strategy: input.strategy }, "Starting PageSpeed analysis");
      
      const result = await this.client.analyzePageSpeed(input, correlationId);
      
      return {
        content: [
          {
            type: "text",
            text: this.formatAnalysisReport(result, input),
          },
          {
            type: "resource",
            resource: {
              uri: `data:application/json;base64,${Buffer.from(JSON.stringify(result, null, 2)).toString('base64')}`,
              name: "raw_pagespeed_data.json",
              mimeType: "application/json",
            },
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

    if (performance) {
      report += `## Performance Score: ${Math.round(performance.score * 100)}/100\n\n`;
    }

    report += `## Core Web Vitals\n`;
    const cwvMetrics = ["largest-contentful-paint", "first-input-delay", "cumulative-layout-shift"];
    cwvMetrics.forEach(metric => {
      const audit = audits?.[metric];
      if (audit) {
        report += `- **${audit.title}**: ${audit.displayValue} ${audit.score === 1 ? "✅" : audit.score >= 0.9 ? "⚠️" : "❌"}\n`;
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
      "first_input_delay": "First Input Delay", 
      "cumulative_layout_shift": "Cumulative Layout Shift",
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
          better: auditA.score > auditB.score ? 'A' : auditA.score < auditB.score ? 'B' : 'tie',
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

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info("PageSpeed Insights MCP server started");
  }
}

const server = new PageSpeedInsightsServer();
server.start().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});