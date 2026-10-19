import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { PageSpeedInsightsServer } from "../index.js";
import { PROMPTS, getPrompt } from "../prompts.js";

vi.mock("../env.js", () => ({
  validateEnv: () => {},
  getEnv: () => ({
    GOOGLE_API_KEY: "prompts-test-key",
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

describe("MCP Prompts unit & protocol contract", () => {
  describe("unit: getPrompt", () => {
    it("lists exactly the 3 workflow prompts", () => {
      expect(PROMPTS.map((p) => p.name)).toEqual([
        "performance-audit",
        "release-comparison",
        "core-web-vitals-deepdive",
      ]);
    });

    it("generates performance-audit messages with required url", () => {
      const res = getPrompt("performance-audit", { url: "https://example.com", strategy: "desktop" });
      expect(res.description).toContain("https://example.com");
      expect(res.messages).toHaveLength(1);
      expect(res.messages[0].role).toBe("user");
      const text = (res.messages[0].content as any).text;
      expect(text).toContain("https://example.com");
      expect(text).toContain("desktop");
      expect(text).toContain("pagespeed_analyze_page");
      expect(text).toContain("pagespeed_get_field_data");
      expect(text).toContain("pagespeed_diagnose_page");
    });

    it("throws when performance-audit is missing required url argument", () => {
      expect(() => getPrompt("performance-audit", {})).toThrow("Argument 'url' is required");
    });

    it("generates release-comparison messages comparing production and staging", () => {
      const res = getPrompt("release-comparison", {
        productionUrl: "https://example.com",
        stagingUrl: "https://preview.example.com",
      });
      expect(res.messages[0].role).toBe("user");
      const text = (res.messages[0].content as any).text;
      expect(text).toContain("https://example.com");
      expect(text).toContain("https://preview.example.com");
      expect(text).toContain("pagespeed_compare_pages");
      expect(text).toContain("Release Recommendation (GO / NO-GO)");
    });

    it("throws when release-comparison is missing arguments", () => {
      expect(() => getPrompt("release-comparison", { productionUrl: "https://example.com" })).toThrow(
        "Arguments 'productionUrl' and 'stagingUrl' are required"
      );
    });

    it("generates core-web-vitals-deepdive messages with scope", () => {
      const res = getPrompt("core-web-vitals-deepdive", {
        url: "https://example.com",
        scope: "origin",
      });
      const text = (res.messages[0].content as any).text;
      expect(text).toContain("https://example.com");
      expect(text).toContain("scope: origin");
      expect(text).toContain("Chrome User Experience Report (CrUX)");
      expect(text).toContain("Lighthouse lab metrics");
    });

    it("throws when core-web-vitals-deepdive is missing required url argument", () => {
      expect(() => getPrompt("core-web-vitals-deepdive", {})).toThrow("Argument 'url' is required");
    });

    it("throws for unknown prompt", () => {
      expect(() => getPrompt("unknown-prompt")).toThrow("Unknown prompt 'unknown-prompt'");
    });
  });

  describe("protocol: MCP client interaction", () => {
    let client: Client;
    let server: Server;

    beforeEach(async () => {
      const app = new PageSpeedInsightsServer();
      server = (app as unknown as { server: Server }).server;
      client = new Client({ name: "prompts-protocol-client", version: "1.0.0" });
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      await server.connect(serverTransport);
      await client.connect(clientTransport);
    });

    afterEach(async () => {
      await client.close();
      await server.close();
    });

    it("negotiates prompts capability and lists prompts via listPrompts()", async () => {
      expect(client.getServerCapabilities()?.prompts).toBeDefined();
      const { prompts } = await client.listPrompts();
      expect(prompts.map((p) => p.name)).toEqual([
        "performance-audit",
        "release-comparison",
        "core-web-vitals-deepdive",
      ]);
    });

    it("retrieves prompt via getPrompt() over MCP protocol", async () => {
      const result = await client.getPrompt({
        name: "performance-audit",
        arguments: { url: "https://example.com/shop" },
      });

      expect(result.description).toContain("https://example.com/shop");
      expect(result.messages).toHaveLength(1);
      expect((result.messages[0].content as any).text).toContain("https://example.com/shop");
    });
  });
});
