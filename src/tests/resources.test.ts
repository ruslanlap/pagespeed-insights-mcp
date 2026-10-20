import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { PageSpeedInsightsServer } from "../index.js";
import { RESOURCES, readResource } from "../resources.js";
import { saveBaseline } from "../baselines.js";

vi.mock("../env.js", () => ({
  validateEnv: () => {},
  getEnv: () => ({
    GOOGLE_API_KEY: "resources-test-key",
    REQUEST_TIMEOUT: 30000,
    RETRY_ATTEMPTS: 0,
    CACHE_TTL: 3600,
    MAX_CONCURRENCY: 3,
    LOG_LEVEL: "silent",
    NODE_ENV: "test",
  }),
}));

vi.mock("../logger.js", () => {
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return { getLogger: () => logger, createRequestLogger: () => logger };
});

describe("MCP Resources unit & protocol contract", () => {
  let tempBaseDir: string;

  beforeEach(() => {
    tempBaseDir = mkdtempSync(join(tmpdir(), "psi-res-"));
    process.env.PAGESPEED_BASELINES_DIR = tempBaseDir;
  });

  afterEach(() => {
    delete process.env.PAGESPEED_BASELINES_DIR;
    rmSync(tempBaseDir, { recursive: true, force: true });
  });

  describe("unit: readResource", () => {
    it("lists exactly the two exposed resources", () => {
      expect(RESOURCES.map((r) => r.uri)).toEqual([
        "pagespeed://web-vitals-guide",
        "pagespeed://baselines",
      ]);
    });

    it("reads pagespeed://web-vitals-guide markdown guide", () => {
      const result = readResource("pagespeed://web-vitals-guide");
      expect(result.contents).toHaveLength(1);
      const content = result.contents[0] as any;
      expect(content.uri).toBe("pagespeed://web-vitals-guide");
      expect(content.mimeType).toBe("text/markdown");
      expect(content.text).toContain("Core Web Vitals");
      expect(content.text).toContain("LCP");
      expect(content.text).toContain("INP");
      expect(content.text).toContain("CLS");
      expect(content.text).toContain("2.5 s");
      expect(content.text).toContain("200 ms");
    });

    it("reads pagespeed://baselines json containing saved baselines", () => {
      saveBaseline(
        "https://example.com",
        "mobile",
        {
          stats: { analyses: 1, requested: 1, cachedReplays: 0 },
          scores: { performance: { median: 85, min: 85, max: 85 } },
          metrics: { "largest-contentful-paint": { median: 2100, min: 2100, max: 2100 } },
        },
        "12.0.0"
      );

      const result = readResource("pagespeed://baselines");
      expect(result.contents).toHaveLength(1);
      const content = result.contents[0] as any;
      expect(content.uri).toBe("pagespeed://baselines");
      expect(content.mimeType).toBe("application/json");

      const parsed = JSON.parse(content.text);
      expect(parsed["https://example.com|mobile"]).toBeDefined();
      expect(parsed["https://example.com|mobile"].scores.performance.median).toBe(85);
      expect(parsed["https://example.com|mobile"].lighthouseVersion).toBe("12.0.0");
    });

    it("throws for unknown resource URI", () => {
      expect(() => readResource("pagespeed://unknown")).toThrow("Resource 'pagespeed://unknown' not found");
    });
  });

  describe("protocol: MCP client interaction", () => {
    let client: Client;
    let server: Server;

    beforeEach(async () => {
      const app = new PageSpeedInsightsServer();
      server = (app as unknown as { server: Server }).server;
      client = new Client({ name: "resources-protocol-client", version: "1.0.0" });
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      await server.connect(serverTransport);
      await client.connect(clientTransport);
    });

    afterEach(async () => {
      await client.close();
      await server.close();
    });

    it("negotiates resources capability and lists resources via listResources()", async () => {
      expect(client.getServerCapabilities()?.resources).toBeDefined();
      const { resources } = await client.listResources();
      expect(resources.map((r) => r.uri)).toEqual([
        "pagespeed://web-vitals-guide",
        "pagespeed://baselines",
      ]);
    });

    it("retrieves resource contents via readResource() over MCP protocol", async () => {
      const result = await client.readResource({ uri: "pagespeed://web-vitals-guide" });
      expect(result.contents).toHaveLength(1);
      const content = result.contents[0] as any;
      expect(content.uri).toBe("pagespeed://web-vitals-guide");
      expect(content.text).toContain("Core Web Vitals");
    });
  });
});
