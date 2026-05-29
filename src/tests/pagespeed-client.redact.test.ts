import { describe, it, expect, beforeEach, vi } from "vitest";
import nock from "nock";

const SECRET_KEY = "super-secret-api-key-9999";

// Mock env BEFORE importing the client so the constructor sees our key.
vi.mock("../env.js", () => ({
  getEnv: () => ({
    GOOGLE_API_KEY: SECRET_KEY,
    REQUEST_TIMEOUT: 30000,
    RETRY_ATTEMPTS: 0,
    CACHE_TTL: 3600,
    MAX_CONCURRENCY: 3,
    LOG_LEVEL: "info",
    NODE_ENV: "test",
  }),
}));

// Capture every {payload, msg} pair the client logs at any level via a fake
// pino child logger. We don't care which level was used — only that nothing
// contains the API key.
const logCalls: Array<{ level: string; payload: unknown; msg?: string }> = [];

const fakeChild = {
  debug: (payload: unknown, msg?: string) => logCalls.push({ level: "debug", payload, msg }),
  info: (payload: unknown, msg?: string) => logCalls.push({ level: "info", payload, msg }),
  warn: (payload: unknown, msg?: string) => logCalls.push({ level: "warn", payload, msg }),
  error: (payload: unknown, msg?: string) => logCalls.push({ level: "error", payload, msg }),
  child: () => fakeChild,
};

vi.mock("../logger.js", () => ({
  getLogger: () => fakeChild,
  createRequestLogger: () => fakeChild,
}));

// Imports must come AFTER the mocks above.
const { PageSpeedClient } = await import("../pagespeed-client.js");
const { cache } = await import("../cache.js");

describe("PageSpeedClient redaction", () => {
  let client: InstanceType<typeof PageSpeedClient>;

  beforeEach(() => {
    client = new PageSpeedClient();
    nock.cleanAll();
    cache.clear();
    logCalls.length = 0;
  });

  it("does not log the API key on a fetch network failure", async () => {
    // Simulate a network error from googleapis. node-fetch wraps the cause
    // into error.message; we want to confirm the message is redacted before
    // it hits the logger.
    nock("https://www.googleapis.com")
      .get("/pagespeedonline/v5/runPagespeed")
      .query(true)
      .replyWithError(`getaddrinfo ENOTFOUND for url with key=${SECRET_KEY}`);

    await expect(
      client.analyzePageSpeed(
        {
          url: "https://example.com",
          strategy: "mobile",
          category: ["performance"],
          locale: "en",
        },
        "corr-redact-1"
      )
    ).rejects.toThrow();

    // The PSI request logger.warn call should exist and must NOT contain the key.
    const warnCalls = logCalls.filter((c) => c.level === "warn");
    expect(warnCalls.length).toBeGreaterThan(0);
    for (const call of warnCalls) {
      const serialised = JSON.stringify(call);
      expect(serialised).not.toContain(SECRET_KEY);
      expect(serialised).toContain("[REDACTED]");
    }
  });

  it("does not log the API key in the debug request line", async () => {
    nock("https://www.googleapis.com")
      .get("/pagespeedonline/v5/runPagespeed")
      .query(true)
      .reply(200, { lighthouseResult: { categories: {}, audits: {} } });

    await client.analyzePageSpeed(
      {
        url: "https://example.com",
        strategy: "mobile",
        category: ["performance"],
        locale: "en",
      },
      "corr-redact-2"
    );

    const allSerialised = JSON.stringify(logCalls);
    expect(allSerialised).not.toContain(SECRET_KEY);
  });

  it("does not log the API key on a CrUX failure", async () => {
    nock("https://chromeuxreport.googleapis.com")
      .post("/v1/records:queryRecord")
      .query(true)
      .replyWithError(`crux blew up with key=${SECRET_KEY}`);

    await expect(
      client.getCruxData({ url: "https://example.com" }, "corr-redact-3")
    ).rejects.toThrow();

    const warnCalls = logCalls.filter((c) => c.level === "warn");
    expect(warnCalls.length).toBeGreaterThan(0);
    for (const call of warnCalls) {
      const serialised = JSON.stringify(call);
      expect(serialised).not.toContain(SECRET_KEY);
    }
  });
});
