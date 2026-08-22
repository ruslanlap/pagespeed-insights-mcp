import fetch from "node-fetch";
import pRetry from "p-retry";
import pLimit from "p-limit";
import { createRequire } from "module";
import { getEnv } from "./env.js";
import { createRequestLogger } from "./logger.js";
import { cache, createPSICacheKey, createCruxCacheKey } from "./cache.js";
import { summariseMultirun } from "./multirun.js";
import type { 
  AnalyzePageSpeedInput, 
  CruxSummaryInput,
  OriginCruxInput,
} from "./schemas.js";
import type { PageSpeedInsightsResponse } from "./types.js";

const pkg = createRequire(import.meta.url)("../package.json") as { version: string };
const USER_AGENT = `pagespeed-insights-mcp/${pkg.version}`;

export class PageSpeedClient {
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly retryAttempts: number;
  private readonly limiter: ReturnType<typeof pLimit>;
  private readonly cacheTTL: number;

  constructor() {
    const env = getEnv();
    this.apiKey = env.GOOGLE_API_KEY;
    this.timeout = env.REQUEST_TIMEOUT;
    this.retryAttempts = env.RETRY_ATTEMPTS;
    this.cacheTTL = env.CACHE_TTL * 1000; // Convert to milliseconds
    this.limiter = pLimit(env.MAX_CONCURRENCY);
  }

  // Strip the API key out of anything that may end up in logs or error traces.
  private redact(text: string): string {
    return text.replaceAll(this.apiKey, "[REDACTED]");
  }

  private async makeRequest(url: string, correlationId: string): Promise<any> {
    const logger = createRequestLogger(correlationId, "psi-request");

    return pRetry(
      async (attempt) => {
        logger.debug({ attempt, url: this.redact(url) }, "Making PSI request");
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
          const response = await fetch(url, {
            signal: controller.signal,
            headers: {
              "User-Agent": USER_AGENT,
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
          logger.warn({ attempt, error: this.redact(errorMessage) }, "PSI request failed");
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
    correlationId: string,
    onRunComplete?: () => void
  ): Promise<PageSpeedInsightsResponse> {
    if (input.strategy === "both") {
      const mobile = await this.analyzePageSpeed({ ...input, strategy: "mobile" }, correlationId, onRunComplete);
      const desktop = await this.analyzePageSpeed({ ...input, strategy: "desktop" }, correlationId, onRunComplete);
      return {
        ...mobile,
        desktopResult: desktop,
        // ponytail: report renders desktopResult via its own multirun block; no deep merge
      };
    }
    const logger = createRequestLogger(correlationId, "analyze-page-speed");
    const runs = Math.max(1, Math.min(5, input.runs ?? 1));
    
    return this.limiter(async () => {
      const cacheKey = createPSICacheKey(
        input.url,
        input.strategy,
        input.category || ["performance"],
        input.locale
      );
      
      // Try cache first (only for single-run requests: a multirun exists to
      // measure fresh, replaying our own cache would defeat it)
      if (runs === 1) {
        const cached = cache.get<PageSpeedInsightsResponse>(cacheKey);
        if (cached) {
          logger.debug("Cache hit for PSI request");
          return cached;
        }
      }
      
      logger.info({ url: input.url, strategy: input.strategy, runs }, "Starting PSI analysis");
      
      const url = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
      url.searchParams.set("url", input.url);
      url.searchParams.set("key", this.apiKey);
      url.searchParams.set("strategy", input.strategy);
      url.searchParams.set("locale", input.locale);
      
      if (input.category && input.category.length > 0) {
        input.category.forEach((cat: string) => url.searchParams.append("category", cat));
      }
      
      const data = await this.makeRequest(url.toString(), correlationId);
      
      if (runs === 1) {
        cache.set(cacheKey, data, this.cacheTTL);
        return data as PageSpeedInsightsResponse;
      }
      
      // Multirun: collect N analyses, wait out Google's ~1min re-analysis
      // window between calls so runs are genuinely distinct.
      const all: PageSpeedInsightsResponse[] = [data as PageSpeedInsightsResponse];
      onRunComplete?.();
      for (let i = 1; i < runs; i++) {
        await new Promise((r) => setTimeout(r, 65_000));
        try {
          all.push(await this.makeRequest(url.toString(), correlationId) as PageSpeedInsightsResponse);
          onRunComplete?.();
        } catch (e) {
          logger.warn({ run: i + 1, error: e instanceof Error ? e.message : String(e) }, "Run failed, continuing with fewer");
        }
      }
      (all[0] as any).multirun = summariseMultirun(all);
      return all[0];
    });
  }

  // Shared CrUX POST with retry — ponytail: one helper for both CrUX methods,
  // add per-method knobs only if they ever diverge. Limiter acquired HERE only;
  // callers must not wrap in this.limiter (nested acquisition deadlocks at limit 1).
  private async cruxPost(body: Record<string, unknown>, correlationId: string, label: string): Promise<any> {
    const logger = createRequestLogger(correlationId, label);
    return this.limiter(async () => {
      const url = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${this.apiKey}`;
      return pRetry(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.timeout);
          try {
            const response = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
              body: JSON.stringify(body),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
              const errorText = await response.text();
              const error = new Error(`CrUX API error: ${response.status} ${response.statusText} - ${errorText}`);
              if (response.status >= 400 && response.status < 500) error.name = "ClientError";
              throw error;
            }
            return await response.json();
          } catch (error) {
            clearTimeout(timeoutId);
            const msg = error instanceof Error ? error.message : "Unknown error";
            logger.warn({ error: this.redact(msg) }, `${label} failed`);
            throw error;
          }
        },
        {
          retries: this.retryAttempts,
          onFailedAttempt: (error) => { if (error.name === "ClientError") throw error; },
          factor: 2, minTimeout: 1000, maxTimeout: 10000,
        }
      );
    });
  }


  async getCruxData(input: CruxSummaryInput, correlationId: string): Promise<any> {
    const logger = createRequestLogger(correlationId, "crux-summary");
    const cacheKey = createCruxCacheKey(input.url, input.formFactor);

    const cached = cache.get(cacheKey);
    if (cached) {
      logger.debug("Cache hit for CrUX request");
      return cached;
    }

    logger.info({ url: input.url }, "Fetching CrUX data");

    const requestBody = {
      url: input.url,
      ...(input.formFactor && { formFactor: input.formFactor }),
    };
    const data = await this.cruxPost(requestBody, correlationId, "crux-summary");
    cache.set(cacheKey, data, this.cacheTTL);

    logger.info({ url: input.url }, "CrUX request successful");
    return data;
  }

  async getOriginCruxData(input: OriginCruxInput, correlationId: string): Promise<any> {
    const logger = createRequestLogger(correlationId, "origin-crux");
    const cacheKey = createCruxCacheKey(input.origin, input.formFactor || "ALL");

    const cached = cache.get(cacheKey);
    if (cached) {
      logger.debug("Cache hit for origin CrUX request");
      return cached;
    }

    logger.info({ origin: input.origin }, "Fetching origin CrUX data");

    const requestBody: Record<string, unknown> = { origin: input.origin };
    if (input.formFactor) requestBody.formFactor = input.formFactor;

    const data = await this.cruxPost(requestBody, correlationId, "origin-crux");
    cache.set(cacheKey, data, this.cacheTTL);

    logger.info({ origin: input.origin }, "Origin CrUX request successful");
    return data;
  }
}