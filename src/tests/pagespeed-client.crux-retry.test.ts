import { describe, it, expect, beforeEach, vi } from "vitest";
import nock from "nock";
import { PageSpeedClient } from "../pagespeed-client.js";
import { cache } from "../cache.js";

vi.mock("../env.js", () => ({
  getEnv: () => ({
    GOOGLE_API_KEY: "test-api-key",
    REQUEST_TIMEOUT: 30000,
    RETRY_ATTEMPTS: 2,
    CACHE_TTL: 3600,
    MAX_CONCURRENCY: 3,
    LOG_LEVEL: "info",
    NODE_ENV: "test",
  }),
}));

describe("PageSpeedClient CrUX retry", () => {
  let client: PageSpeedClient;

  beforeEach(() => {
    client = new PageSpeedClient();
    nock.cleanAll();
    cache.clear();
  });

  it("retries transient 5xx and succeeds", async () => {
    const mock = { record: { key: { formFactor: "PHONE" } } };
    const scope = nock("https://chromeuxreport.googleapis.com")
      .post("/v1/records:queryRecord")
      .query(true)
      .twice()
      .reply(500, "server error")
      .post("/v1/records:queryRecord")
      .query(true)
      .reply(200, mock);

    const result = await client.getCruxData(
      { url: "https://example.com" },
      "corr-crux-retry"
    );
    expect(result).toEqual(mock);
    expect(scope.isDone()).toBe(true);
  });

  it("does not retry on 4xx", async () => {
    const scope = nock("https://chromeuxreport.googleapis.com")
      .post("/v1/records:queryRecord")
      .query(true)
      .once()
      .reply(404, { error: { message: "no data" } });

    await expect(
      client.getCruxData({ url: "https://example.com" }, "corr-4xx")
    ).rejects.toThrow(/CrUX API error: 404/);
    expect(scope.isDone()).toBe(true);
  });

  it("caches successful CrUX responses (single HTTP call)", async () => {
    const mock = { record: { key: { formFactor: "PHONE" } } };
    const scope = nock("https://chromeuxreport.googleapis.com")
      .post("/v1/records:queryRecord")
      .query(true)
      .once()
      .reply(200, mock);

    await client.getOriginCruxData({ origin: "https://example.com" }, "c1");
    await client.getOriginCruxData({ origin: "https://example.com" }, "c2");
    expect(scope.isDone()).toBe(true); // second call served from cache
  });
});
