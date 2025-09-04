import fetch from "node-fetch";
import pRetry from "p-retry";
import pLimit from "p-limit";
import { getEnv } from "./env.js";
import { createRequestLogger } from "./logger.js";
import type { 
  AnalyzePageSpeedInput, 
  CruxSummaryInput,
  PageSpeedInsightsResponse 
} from "./types.js";

export class PageSpeedClient {
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly retryAttempts: number;
  private readonly limiter: ReturnType<typeof pLimit>;
  private readonly cache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheTTL: number;

  constructor() {
    const env = getEnv();
    this.apiKey = env.GOOGLE_API_KEY;
    this.timeout = env.REQUEST_TIMEOUT;
    this.retryAttempts = env.RETRY_ATTEMPTS;
    this.cacheTTL = env.CACHE_TTL * 1000; // Convert to milliseconds
    this.limiter = pLimit(env.MAX_CONCURRENCY);
  }

  private createCacheKey(params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join("|");
    return `psi_v5_${sortedParams}`;
  }

  private getCached<T>(cacheKey: string): T | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return cached.data as T;
  }

  private setCache(cacheKey: string, data: any): void {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
  }

  private async makeRequest(url: string, correlationId: string): Promise<any> {
    const logger = createRequestLogger(correlationId, "psi-request");
    
    return pRetry(
      async (attempt) => {
        logger.debug({ attempt, url }, "Making PSI request");
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
          const response = await fetch(url, {
            signal: controller.signal,
            headers: {
              "User-Agent": "pagespeed-insights-mcp/1.0.0",
            },
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorText = await response.text();
            const error = new Error(`PSI API error: ${response.status} ${response.statusText} - ${errorText}`);
            
            // Don't retry on client errors (4xx)
            if (response.status >= 400 && response.status < 500) {
              error.name = "ClientError";
            }
            
            throw error;
          }
          
          const data = await response.json();
          logger.info({ 
            url: new URL(url).searchParams.get("url"),
            strategy: new URL(url).searchParams.get("strategy"),
            responseSize: JSON.stringify(data).length 
          }, "PSI request successful");
          
          return data;
        } catch (error) {
          clearTimeout(timeoutId);
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          logger.warn({ attempt, error: errorMessage }, "PSI request failed");
          throw error;
        }
      },
      {
        retries: this.retryAttempts,
        onFailedAttempt: (error) => {
          if (error.name === "ClientError") {
            throw error; // Don't retry client errors
          }
        },
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 10000,
      }
    );
  }

  async analyzePageSpeed(
    input: AnalyzePageSpeedInput, 
    correlationId: string
  ): Promise<PageSpeedInsightsResponse> {
    const logger = createRequestLogger(correlationId, "analyze-page-speed");
    
    return this.limiter(async () => {
      const cacheKey = this.createCacheKey({
        url: input.url,
        strategy: input.strategy,
        categories: input.category?.join(",") || "performance",
        locale: input.locale,
      });
      
      // Try cache first
      const cached = this.getCached<PageSpeedInsightsResponse>(cacheKey);
      if (cached) {
        logger.debug("Cache hit for PSI request");
        return cached;
      }
      
      logger.info({ url: input.url, strategy: input.strategy }, "Starting PSI analysis");
      
      const url = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
      url.searchParams.set("url", input.url);
      url.searchParams.set("key", this.apiKey);
      url.searchParams.set("strategy", input.strategy);
      url.searchParams.set("locale", input.locale);
      
      if (input.category && input.category.length > 0) {
        input.category.forEach((cat: string) => url.searchParams.append("category", cat));
      }
      
      const data = await this.makeRequest(url.toString(), correlationId);
      this.setCache(cacheKey, data);
      
      return data as PageSpeedInsightsResponse;
    });
  }

  async getCruxData(input: CruxSummaryInput, correlationId: string): Promise<any> {
    const logger = createRequestLogger(correlationId, "crux-summary");
    
    return this.limiter(async () => {
      const cacheKey = this.createCacheKey({
        url: input.url,
        formFactor: input.formFactor || "PHONE",
      });
      
      const cached = this.getCached(cacheKey);
      if (cached) {
        logger.debug("Cache hit for CrUX request");
        return cached;
      }
      
      logger.info({ url: input.url }, "Fetching CrUX data");
      
      const requestBody = {
        url: input.url,
        ...(input.formFactor && { formFactor: input.formFactor }),
      };
      
      const url = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${this.apiKey}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "pagespeed-insights-mcp/1.0.0",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`CrUX API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        this.setCache(cacheKey, data);
        
        logger.info({ url: input.url }, "CrUX request successful");
        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.warn({ error: errorMessage }, "CrUX request failed");
        throw error;
      }
    });
  }
}