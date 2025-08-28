#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import { PageSpeedInsightsRequest, PageSpeedInsightsResponse, MCP_Config } from "./types.js";

class PageSpeedInsightsServer {
  private server: Server;
  private config: MCP_Config;

  constructor() {
    this.server = new Server(
      {
        name: "pagespeed-insights-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.config = {
      apiKey: process.env.GOOGLE_API_KEY,
    };

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "analyze_page_speed",
            description: "Analyze web page performance using Google PageSpeed Insights API",
            inputSchema: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                  description: "The URL of the web page to analyze",
                },
                strategy: {
                  type: "string",
                  enum: ["mobile", "desktop"],
                  description: "The analysis strategy (mobile or desktop)",
                  default: "mobile",
                },
                category: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: ["performance", "accessibility", "best-practices", "seo", "pwa"],
                  },
                  description: "Categories to run Lighthouse audits for",
                  default: ["performance"],
                },
                locale: {
                  type: "string",
                  description: "The locale used to localize formatted results",
                  default: "en",
                },
              },
              required: ["url"],
            },
          },
          {
            name: "get_performance_summary",
            description: "Get a simplified performance summary for a web page",
            inputSchema: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                  description: "The URL of the web page to analyze",
                },
                strategy: {
                  type: "string",
                  enum: ["mobile", "desktop"],
                  description: "The analysis strategy (mobile or desktop)",
                  default: "mobile",
                },
              },
              required: ["url"],
            },
          },
        ] satisfies Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.config.apiKey) {
        throw new Error("Google API key not provided. Please set GOOGLE_API_KEY environment variable.");
      }

      const { name, arguments: args } = request.params;

      switch (name) {
        case "analyze_page_speed":
          return await this.analyzePageSpeed(args as unknown as PageSpeedInsightsRequest);
        case "get_performance_summary":
          return await this.getPerformanceSummary(args as unknown as PageSpeedInsightsRequest);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async analyzePageSpeed(request: PageSpeedInsightsRequest) {
    try {
      const url = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
      url.searchParams.set("url", request.url);
      url.searchParams.set("key", this.config.apiKey!);
      
      if (request.strategy) {
        url.searchParams.set("strategy", request.strategy);
      }
      
      if (request.category && request.category.length > 0) {
        request.category.forEach(cat => url.searchParams.append("category", cat));
      }
      
      if (request.locale) {
        url.searchParams.set("locale", request.locale);
      }

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PageSpeed Insights API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as PageSpeedInsightsResponse;
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
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

  private async getPerformanceSummary(request: PageSpeedInsightsRequest) {
    try {
      const url = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
      url.searchParams.set("url", request.url);
      url.searchParams.set("key", this.config.apiKey!);
      url.searchParams.set("category", "performance");
      
      if (request.strategy) {
        url.searchParams.set("strategy", request.strategy);
      }

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PageSpeed Insights API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as PageSpeedInsightsResponse;
      
      const lighthouseResult = data.lighthouseResult;
      const performanceCategory = lighthouseResult?.categories?.performance;
      const audits = lighthouseResult?.audits;

      const summary = {
        url: request.url,
        strategy: request.strategy || "mobile",
        timestamp: data.analysisUTCTimestamp,
        performance: {
          score: performanceCategory?.score ? Math.round(performanceCategory.score * 100) : null,
          metrics: {
            firstContentfulPaint: audits?.["first-contentful-paint"]?.displayValue,
            largestContentfulPaint: audits?.["largest-contentful-paint"]?.displayValue,
            cumulativeLayoutShift: audits?.["cumulative-layout-shift"]?.displayValue,
            speedIndex: audits?.["speed-index"]?.displayValue,
            totalBlockingTime: audits?.["total-blocking-time"]?.displayValue,
            firstMeaningfulPaint: audits?.["first-meaningful-paint"]?.displayValue,
          },
        },
        opportunities: performanceCategory?.auditRefs
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

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new PageSpeedInsightsServer();
server.start().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});