import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { pathToFileURL } from "url";

vi.mock("../env.js", () => ({
  validateEnv: () => {},
  getEnv: () => ({
    GOOGLE_API_KEY: "test",
    REQUEST_TIMEOUT: 30000,
    RETRY_ATTEMPTS: 0,
    CACHE_TTL: 3600,
    MAX_CONCURRENCY: 3,
    LOG_LEVEL: "info",
    NODE_ENV: "test",
  }),
}));

vi.mock("../logger.js", () => {
  const fakeChild = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => fakeChild,
  };
  return { getLogger: () => fakeChild, createRequestLogger: () => fakeChild };
});

const { isProcessEntrypoint } = await import("../index.js");

describe("isProcessEntrypoint", () => {
  it("returns true when argv[1] is a symlink to the entry file", () => {
    const root = mkdtempSync(join(tmpdir(), "psi-entrypoint-"));
    try {
      const realDir = join(root, "real");
      mkdirSync(realDir);
      const realFile = join(realDir, "index.js");
      writeFileSync(realFile, "#!/usr/bin/env node\n");

      const binShim = join(root, "pagespeed-insights-mcp");
      symlinkSync(realFile, binShim);

      const moduleUrl = pathToFileURL(realFile).href;
      expect(isProcessEntrypoint(moduleUrl, binShim)).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns false when argv[1] points to a different file", () => {
    const root = mkdtempSync(join(tmpdir(), "psi-entrypoint-"));
    try {
      const a = join(root, "a.js");
      const b = join(root, "b.js");
      writeFileSync(a, "a\n");
      writeFileSync(b, "b\n");
      expect(isProcessEntrypoint(pathToFileURL(a).href, b)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns false when argv[1] is missing", () => {
    const moduleUrl = pathToFileURL(join(tmpdir(), "ghost.js")).href;
    expect(isProcessEntrypoint(moduleUrl)).toBe(false);
  });
});
