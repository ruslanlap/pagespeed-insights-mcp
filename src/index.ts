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
import { cache } from "./cache.js";
import { PerformanceRecommendationsEngine } from "./recommendations.js";
import { ResponseParser } from "./response-parser.js";
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
  private recommendationsEngine: PerformanceRecommendationsEngine;
  private logger = getLogger();

  constructor() {
    // Validate environment first
    validateEnv();
    
    this.server = new Server(
      {
        name: "pagespeed-insights-mcp",
        version: "1.0.6",
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
          {
            name: "clear_cache",
            description: "Clear the internal cache to force fresh API requests",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false
            },
          },
          {
            name: "get_recommendations",
            description: "Generate smart performance recommendations with priority scoring and actionable fixes",
            inputSchema: {
              type: "object",
              properties: {
                url: { type: "string", format: "uri", description: "The URL to analyze for recommendations" },
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
                  default: ["performance", "accessibility", "best-practices", "seo"],
                  description: "Categories to analyze for recommendations"
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
            name: "get_visual_analysis",
            description: "Get screenshots and visual timeline showing how the page loads (final screenshot, filmstrip frames, full-page screenshot)",
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
            name: "get_element_analysis",
            description: "Get specific DOM elements causing performance issues (LCP element, CLS elements, lazy-loaded issues)",
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
            name: "get_network_analysis",
            description: "Get detailed network waterfall showing all requests with timing, size, and priority",
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
            name: "get_javascript_analysis",
            description: "Get JavaScript execution breakdown showing bootup time, unused code, and main thread work",
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
            name: "get_image_optimization_details",
            description: "Get specific images needing optimization with exact savings potential",
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
            name: "get_render_blocking_details",
            description: "Get render-blocking resources and critical request chains showing loading dependencies",
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
            name: "get_third_party_impact",
            description: "Get third-party script impact analysis grouped by entity (Google, Facebook, etc.)",
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
            name: "get_full_audit",
            description: "Get comprehensive audit results for all categories (performance, accessibility, SEO, best practices, PWA)",
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
                categories: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: ["performance", "accessibility", "best-practices", "seo", "pwa"]
                  },
                  default: ["performance", "accessibility", "best-practices", "seo"],
                  description: "Categories to audit"
                }
              },
              required: ["url"]
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
        case "clear_cache":
          return await this.handleClearCache();
        case "get_recommendations":
          return await this.handleGetRecommendations(args);
        case "get_visual_analysis":
          return await this.handleGetVisualAnalysis(args);
        case "get_element_analysis":
          return await this.handleGetElementAnalysis(args);
        case "get_network_analysis":
          return await this.handleGetNetworkAnalysis(args);
        case "get_javascript_analysis":
          return await this.handleGetJavaScriptAnalysis(args);
        case "get_image_optimization_details":
          return await this.handleGetImageOptimizationDetails(args);
        case "get_render_blocking_details":
          return await this.handleGetRenderBlockingDetails(args);
        case "get_third_party_impact":
          return await this.handleGetThirdPartyImpact(args);
        case "get_full_audit":
          return await this.handleGetFullAudit(args);
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

    if (performance) {
      report += `## Performance Score: ${Math.round(performance.score * 100)}/100\n\n`;
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

const server = new PageSpeedInsightsServer();
server.start().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});