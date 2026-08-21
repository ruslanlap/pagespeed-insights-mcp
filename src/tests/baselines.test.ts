import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { getBaseline, saveBaseline, clearBaseline, compareBaselines } from "../baselines.js";

const URL_ = "https://example.com";
const S = "mobile";
const mr = (med: number, min: number, max: number) => ({
  stats: { analyses: 3, requested: 3, cachedReplays: 0 },
  scores: { performance: { median: med, min, max } },
  metrics: { "total-blocking-time": { median: med * 10, min: min * 10, max: max * 10 } },
});

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "psi-baseline-"));
  process.env.PAGESPEED_BASELINES_DIR = dir;
});
afterEach(() => {
  delete process.env.PAGESPEED_BASELINES_DIR;
  rmSync(dir, { recursive: true, force: true });
});

describe("baselines", () => {
  it("first save records, second compares", () => {
    expect(getBaseline(URL_, S)).toBeNull();
    saveBaseline(URL_, S, mr(30, 27, 37), "12.0.0");
    expect(getBaseline(URL_, S)?.scores.performance.median).toBe(30);

    const verdicts = compareBaselines(
      getBaseline(URL_, S)!,
      { recorded: "", scores: mr(60, 55, 65).scores, metrics: mr(60, 55, 65).metrics }
    );
    const perf = verdicts.find((v) => v.metric === "performance")!;
    expect(perf.verdict).toBe("improved");
    expect(perf.guaranteedDelta).toBeGreaterThan(0);
  });

  it("overlapping ranges → no verdict, guaranteed 0", () => {
    saveBaseline(URL_, S, mr(30, 27, 37), "12.0.0");
    const verdicts = compareBaselines(
      getBaseline(URL_, S)!,
      { recorded: "", scores: mr(32, 28, 40).scores, metrics: mr(32, 28, 40).metrics }
    );
    for (const v of verdicts) {
      expect(v.verdict).toBe("no-verdict");
      expect(v.guaranteedDelta).toBe(0);
    }
  });

  it("lower-is-better metrics regress correctly (TBT up = regressed)", () => {
    saveBaseline(URL_, S, mr(30, 27, 37), "12.0.0");
    const verdicts = compareBaselines(
      getBaseline(URL_, S)!,
      { recorded: "", scores: mr(50, 45, 55).scores, metrics: mr(50, 45, 55).metrics }
    );
    const tbt = verdicts.find((v) => v.metric === "total-blocking-time")!;
    expect(tbt.verdict).toBe("regressed");
  });

  it("clearBaseline removes", () => {
    saveBaseline(URL_, S, mr(30, 27, 37));
    clearBaseline(URL_, S);
    expect(getBaseline(URL_, S)).toBeNull();
  });
});
