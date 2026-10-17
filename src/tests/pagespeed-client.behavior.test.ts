import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setTimeout as pause } from "node:timers/promises";
import nock from "nock";
import { PageSpeedClient } from "../pagespeed-client.js";
import { cache } from "../cache.js";

const config = vi.hoisted(() => ({ GOOGLE_API_KEY: "test-key-only", REQUEST_TIMEOUT: 100, RETRY_ATTEMPTS: 0, CACHE_TTL: 1, MAX_CONCURRENCY: 1 }));
vi.mock("../env.js", () => ({ getEnv: () => config }));
vi.mock("../logger.js", () => {
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn() };
  return { createRequestLogger: () => logger, getLogger: () => logger };
});
const input = { url: "https://example.com/a?x=1&y=2", strategy: "mobile" as const, category: ["performance"], locale: "en" };
const response = (score = 0.8, stamp = "first") => ({ lighthouseResult: { fetchTime: stamp, categories: { performance: { score } }, audits: {} } });
const psi = () => nock("https://www.googleapis.com").get("/pagespeedonline/v5/runPagespeed").query(true);
const crux = (body?: Record<string, unknown>) => nock("https://chromeuxreport.googleapis.com").post("/v1/records:queryRecord", body).query({ key: config.GOOGLE_API_KEY });
// Nock's network delivery remains real; only application delays are virtual.
async function until(predicate: () => boolean) {
  for (let i = 0; i < 1000; i++) { if (predicate()) return; await pause(1); }
  throw new Error("HTTP operation did not settle");
}

describe("PageSpeedClient HTTP behavior", () => {
  let client: PageSpeedClient;
  beforeEach(() => {
    config.RETRY_ATTEMPTS = 0;
    client = new PageSpeedClient();
    cache.clear();
    nock.disableNetConnect();
  });
  afterEach(() => {
    nock.abortPendingRequests();
    nock.cleanAll();
    nock.enableNetConnect();
    vi.useRealTimers();
  });

  it("sends exact encoded PSI query, repeated categories and versioned user agent", async () => {
    const scope = nock("https://www.googleapis.com", { reqheaders: { "user-agent": /^pagespeed-insights-mcp\/\d/ } })
      .get("/pagespeedonline/v5/runPagespeed")
      .query({ url: input.url, key: config.GOOGLE_API_KEY, strategy: "desktop", locale: "uk", category: ["accessibility", "performance"] })
      .reply(200, response());
    await expect(client.analyzePageSpeed({ ...input, strategy: "desktop", locale: "uk", category: ["performance", "accessibility"] }, "query")).resolves.toEqual(response());
    expect(scope.isDone()).toBe(true);
  });

  it.each([
    { url: "https://other.example" }, { strategy: "desktop" as const }, { locale: "fr" }, { category: ["seo"] },
  ])("isolates PSI cache by %j", async (change) => {
    const scope = psi().reply(200, response()).get("/pagespeedonline/v5/runPagespeed").query(true).reply(200, response(0.4));
    await client.analyzePageSpeed(input, "one");
    expect(await client.analyzePageSpeed({ ...input, ...change }, "two")).toEqual(response(0.4));
    expect(await client.analyzePageSpeed(input, "cached")).toEqual(response());
    expect(scope.isDone()).toBe(true);
  });

  it("expires PSI cache after the configured TTL", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const scope = psi().reply(200, response()).get("/pagespeedonline/v5/runPagespeed").query(true).reply(200, response(0.4));
    await client.analyzePageSpeed(input, "one");
    vi.setSystemTime(Date.now() + 1001);
    expect(await client.analyzePageSpeed(input, "expired")).toEqual(response(0.4));
    expect(scope.isDone()).toBe(true);
  });

  it("returns both strategies with independently cached results", async () => {
    const scope = nock("https://www.googleapis.com").get("/pagespeedonline/v5/runPagespeed").query((q) => q.strategy === "mobile").reply(200, response())
      .get("/pagespeedonline/v5/runPagespeed").query((q) => q.strategy === "desktop").reply(200, response(0.9));
    const result = await client.analyzePageSpeed({ ...input, strategy: "both" }, "both");
    expect(result).toEqual({ ...response(), desktopResult: response(0.9) });
    expect(await client.analyzePageSpeed({ ...input, strategy: "both" }, "cached")).toEqual(result);
    expect(scope.isDone()).toBe(true);
  });

  it("sends page and origin CrUX bodies and isolates scope and form factor", async () => {
    const scopes = [
      crux({ url: input.url, formFactor: "PHONE" }).reply(200, { record: { id: "page" } }),
      crux({ origin: input.url }).reply(200, { record: { id: "origin" } }),
      crux({ url: input.url, formFactor: "DESKTOP" }).reply(200, { record: { id: "desktop" } }),
      crux({ url: "https://no-factor.example" }).reply(200, {}),
    ];
    expect(await client.getCruxData({ url: input.url, formFactor: "PHONE" }, "p")).toEqual({ record: { id: "page" } });
    expect(await client.getOriginCruxData({ origin: input.url, formFactor: "ALL" }, "o")).toEqual({ record: { id: "origin" } });
    expect(await client.getCruxData({ url: input.url, formFactor: "DESKTOP" }, "d")).toEqual({ record: { id: "desktop" } });
    await client.getCruxData({ url: "https://no-factor.example" }, "none");
    expect(await client.getCruxData({ url: input.url, formFactor: "PHONE" }, "cached")).toEqual({ record: { id: "page" } });
    expect(scopes.every(s => s.isDone())).toBe(true);
  });

  it.each(["psi", "page", "origin"])("does not retry %s client errors", async (kind) => {
    config.RETRY_ATTEMPTS = 2;
    client = new PageSpeedClient();
    const scope = (kind === "psi" ? psi() : crux()).reply(403, "denied");
    const request = kind === "psi" ? client.analyzePageSpeed(input, "403") : kind === "page" ? client.getCruxData({ url: input.url }, "403") : client.getOriginCruxData({ origin: input.url }, "403");
    await expect(request).rejects.toMatchObject({ name: "ClientError", message: expect.stringContaining("403") });
    expect(scope.isDone()).toBe(true);
  });

  it.each(["psi", "crux"])("retries %s transient failures using backoff", async (kind) => {
    config.RETRY_ATTEMPTS = 2;
    client = new PageSpeedClient();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let calls = 0;
    const scope = (kind === "psi" ? psi() : crux()).times(3).reply(() => [++calls < 3 ? 503 : 200, calls < 3 ? "busy" : response()]);
    const request = kind === "psi" ? client.analyzePageSpeed(input, "retry") : client.getCruxData({ url: input.url }, "retry");
    await until(() => calls === 1);
    await pause(20);
    await vi.advanceTimersByTimeAsync(1000);
    await until(() => calls === 2);
    await pause(20);
    await vi.advanceTimersByTimeAsync(2000);
    await expect(request).resolves.toEqual(response());
    expect(scope.isDone()).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["psi", "crux"])("aborts %s on timeout without retrying", async (kind) => {
    config.RETRY_ATTEMPTS = 2;
    client = new PageSpeedClient();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let started = false;
    (kind === "psi" ? psi() : crux()).delay(500).reply(() => { started = true; return [200, response()]; });
    const request = kind === "psi" ? client.analyzePageSpeed(input, "timeout") : client.getCruxData({ url: input.url }, "timeout");
    const assertion = expect(request).rejects.toMatchObject({ name: "AbortError" });
    await until(() => started);
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["not-json", "null", '{}', '{"error":{"message":"upstream failure"}}'])("rejects malformed PSI payload %s instead of caching it", async (body) => {
    const scope = psi().reply(200, body, { "content-type": "application/json" });
    await expect(client.analyzePageSpeed(input, "malformed")).rejects.toThrow();
    expect(cache.size()).toBe(0);
    expect(scope.isDone()).toBe(true);
  });

  it.each([{ message: "Navigation failed" }, { code: "NO_FCP" }])("rejects Lighthouse runtimeError %j", async (runtimeError) => {
    psi().reply(200, { lighthouseResult: { runtimeError } });
    await expect(client.analyzePageSpeed(input, "runtime")).rejects.toThrow(runtimeError.message || runtimeError.code);
    expect(cache.size()).toBe(0);
  });

  it("runs fresh analyses 65 seconds apart, reports progress and returns serializable results", async () => {
    await (async () => { psi().reply(200, response(0.1, "cached")); await client.analyzePageSpeed(input, "prime"); })();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const scope = psi().reply(200, response(0.6)).get("/pagespeedonline/v5/runPagespeed").query(true).reply(200, response(1, "second"));
    const progress = vi.fn();
    const request = client.analyzePageSpeed({ ...input, runs: 2 }, "multi", progress);
    await until(() => progress.mock.calls.length === 1);
    await vi.advanceTimersByTimeAsync(64_999);
    expect(progress).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    const result = await request;
    expect(result.multirun?.scores.performance).toEqual({ median: 80, min: 60, max: 100 });
    expect(progress).toHaveBeenCalledTimes(2);
    expect(scope.isDone()).toBe(true);
    expect(() => JSON.stringify(result)).not.toThrow();
    expect(await client.analyzePageSpeed(input, "still-cached")).toEqual(response(0.1, "cached"));
  });

  it("continues after a failed later run and preserves the requested count", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let calls = 0;
    psi().times(3).reply(() => { calls++; return calls === 2 ? [400, "failed run"] : [200, response(0.8, String(calls))]; });
    const progress = vi.fn();
    const request = client.analyzePageSpeed({ ...input, runs: 3 }, "partial", progress);
    await until(() => progress.mock.calls.length === 1);
    await vi.advanceTimersByTimeAsync(65_000);
    await until(() => calls === 2);
    await pause(20);
    await vi.advanceTimersByTimeAsync(65_000);
    const result = await request;
    expect(result.multirun?.stats).toEqual({ requested: 3, analyses: 2, cachedReplays: 0 });
    expect(progress).toHaveBeenCalledTimes(2);
  });

  it("cancels during the multirun wait without another HTTP call", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    psi().reply(200, response());
    const controller = new AbortController();
    const progress = vi.fn();
    const request = client.withSignal(controller.signal, () => client.analyzePageSpeed({ ...input, runs: 3 }, "cancel", progress));
    const assertion = expect(request).rejects.toMatchObject({ name: "AbortError" });
    await until(() => progress.mock.calls.length === 1);
    controller.abort();
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
    expect(progress).toHaveBeenCalledTimes(1);
  });

  it("honors cancellation raised synchronously by the progress callback", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    psi().reply(200, response());
    const controller = new AbortController();
    let settled = false;
    const request = client.withSignal(controller.signal, () => client.analyzePageSpeed({ ...input, runs: 2 }, "progress-cancel", () => controller.abort()));
    const assertion = expect(request).rejects.toMatchObject({ name: "AbortError" });
    void request.catch(() => { settled = true; });
    await until(() => controller.signal.aborted);
    await pause(10);
    expect(settled).toBe(true);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["psi", "page", "origin"])("does not send a cancelled queued %s request", async (kind) => {
    let started = false;
    const scope = psi().delay(30).reply(() => { started = true; return [200, response()]; });
    const running = client.analyzePageSpeed({ ...input, url: "https://busy.example" }, "busy");
    await until(() => started);
    const controller = new AbortController();
    const queued = client.withSignal(controller.signal, () => kind === "psi"
      ? client.analyzePageSpeed(input, "queued")
      : kind === "page" ? client.getCruxData({ url: input.url }, "queued")
      : client.getOriginCruxData({ origin: input.url }, "queued"));
    const assertion = expect(queued).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await Promise.all([running, assertion]);
    expect(scope.isDone()).toBe(true);
  });

  it("rejects a cancelled queued request even when its result is cached", async () => {
    psi().reply(200, response());
    await client.analyzePageSpeed(input, "prime");
    let started = false;
    psi().delay(30).reply(() => { started = true; return [200, response()]; });
    const running = client.analyzePageSpeed({ ...input, url: "https://busy.example" }, "running");
    await until(() => started);
    const controller = new AbortController();
    const queued = client.withSignal(controller.signal, () => client.analyzePageSpeed(input, "queued"));
    const assertion = expect(queued).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await running;
    await assertion;
  });
});
