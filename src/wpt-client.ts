/*
 * Copyright 2026 Switas
 *
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE.
 * Part of Switas Web Performance MCP, built on ruslanlap/pagespeed-insights-mcp.
 */
/**
 * Minimal WebPageTest (Catchpoint) API client.
 *
 * Docs: https://docs.webpagetest.org/api/reference/
 * Auth: the API key is sent as the X-WPT-API-KEY header (never in the URL).
 */

const WPT_BASE = "https://www.webpagetest.org";

export interface WptRunOptions {
  url: string;
  location: string; // e.g. FRA_DE_02
  browser: string; // e.g. Chrome
  connectivity: string; // e.g. 4G, Cable, 3GFast, Native
  mobile: boolean;
  runs: number;
  firstViewOnly: boolean;
  label?: string;
  blockDomains?: string[];
  block?: string[];
  script?: string;
  lighthouse?: boolean;
  pingback?: string;
}

export interface WptSubmitResult {
  testId: string;
  userUrl: string;
  jsonUrl: string;
}

export interface WptStatus {
  statusCode: number;
  statusText: string;
  done: boolean;
  failed: boolean;
}

export class WptClient {
  constructor(
    private readonly apiKey: string | undefined,
    private readonly requestTimeoutMs = 60_000,
  ) {}

  get configured(): boolean {
    return Boolean(this.apiKey);
  }

  private async getJson(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<any> {
    const qs = new URLSearchParams({ ...params, f: "json" });
    const timeout = AbortSignal.timeout(this.requestTimeoutMs);
    const res = await fetch(`${WPT_BASE}${path}?${qs.toString()}`, {
      headers: this.apiKey ? { "X-WPT-API-KEY": this.apiKey } : {},
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    const text = await res.text();
    let body: any;
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(`WebPageTest returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
    }
    if (!res.ok) {
      throw new Error(`WebPageTest HTTP ${res.status}: ${body?.statusText ?? text.slice(0, 200)}`);
    }
    return body;
  }

  async submit(opts: WptRunOptions, signal?: AbortSignal): Promise<WptSubmitResult> {
    if (!this.apiKey) throw new Error("WPT_API_KEY is not set. Add it to the MCP server env to use WebPageTest tools.");
    const params: Record<string, string> = {
      url: opts.url,
      location: `${opts.location}:${opts.browser}.${opts.connectivity}`,
      runs: String(opts.runs),
      fvonly: opts.firstViewOnly ? "1" : "0",
      mobile: opts.mobile ? "1" : "0",
      video: "1",
    };
    if (opts.label) params.label = opts.label;
    if (opts.blockDomains?.length) params.blockDomains = opts.blockDomains.join(" ");
    if (opts.block?.length) params.block = opts.block.join(" ");
    if (opts.script) params.script = opts.script;
    if (opts.lighthouse) params.lighthouse = "1";
    if (opts.pingback) params.pingback = opts.pingback;

    const body = await this.getJson("/runtest.php", params, signal);
    if (body.statusCode !== 200 || !body.data?.testId) {
      throw new Error(`WebPageTest rejected the test: ${body.statusCode} ${body.statusText ?? ""}`.trim());
    }
    return { testId: body.data.testId, userUrl: body.data.userUrl, jsonUrl: body.data.jsonUrl };
  }

  async status(testId: string, signal?: AbortSignal): Promise<WptStatus> {
    const body = await this.getJson("/testStatus.php", { test: testId }, signal);
    const code = Number(body.statusCode);
    return { statusCode: code, statusText: String(body.statusText ?? ""), done: code === 200, failed: code >= 400 };
  }

  async result(testId: string, signal?: AbortSignal): Promise<any> {
    const body = await this.getJson("/jsonResult.php", { test: testId, requests: "1", breakdown: "1", domains: "1" }, signal);
    if (body.statusCode !== 200 || !body.data) {
      throw new Error(`Result not ready for ${testId}: ${body.statusCode} ${body.statusText ?? ""}`.trim());
    }
    return body.data;
  }

  async locations(signal?: AbortSignal): Promise<any> {
    const body = await this.getJson("/getLocations.php", {}, signal);
    return body.data ?? {};
  }

  async balance(signal?: AbortSignal): Promise<number | undefined> {
    const body = await this.getJson("/testBalance.php", {}, signal);
    return body?.data?.remaining;
  }

  /** Poll until the test completes, fails, or maxWaitMs passes. Returns the final status. */
  async waitFor(testId: string, maxWaitMs: number, onTick?: () => void, signal?: AbortSignal): Promise<WptStatus> {
    const started = Date.now();
    let st = await this.status(testId, signal);
    while (!st.done && !st.failed && Date.now() - started < maxWaitMs) {
      await new Promise((r) => setTimeout(r, 8_000));
      onTick?.();
      st = await this.status(testId, signal);
    }
    return st;
  }
}
