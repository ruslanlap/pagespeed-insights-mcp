import { describe, it, expect } from "vitest";
import { dedupRuns, median, spread, summariseMultirun } from "../multirun.js";

const run = (stamp: string, score = 50, tbt = 300) => ({
  lighthouseResult: {
    analysisUTCTimestamp: stamp,
    categories: { performance: { score: score / 100 } },
    audits: { "total-blocking-time": { numericValue: tbt } },
  },
});

describe("dedupRuns", () => {
  it("drops cached replays (same fetchTime)", () => {
    const unique = dedupRuns([run("t1", 40, 200), run("t1", 50, 300), run("t2", 60, 400)]);
    expect(unique).toHaveLength(2);
  });

  it("drops identical fingerprints without stamps", () => {
    const a = run("", 50, 300);
    const b = { lighthouseResult: { ...a.lighthouseResult, analysisUTCTimestamp: "" } };
    expect(dedupRuns([a, b])).toHaveLength(1);
  });

  it("keeps empty runs — two failures are not one replay", () => {
    expect(dedupRuns([{ lighthouseResult: {} }, { lighthouseResult: {} }])).toHaveLength(2);
  });
});

describe("median/spread", () => {
  it("median of odd count", () => {
    expect(median([300, 100, 200])).toBe(200);
  });
  it("median of even count averages middle pair", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it("spread returns min/max around median", () => {
    expect(spread([5, 1, 9])).toEqual({ median: 5, min: 1, max: 9 });
  });
});

describe("summariseMultirun", () => {
  it("reports replays and score spread on 0-100 scale", () => {
    const s = summariseMultirun([run("t1", 40, 200), run("t1", 40, 200), run("t2", 60, 400), run("t3", 50, 300)]);
    expect(s.stats).toEqual({ analyses: 3, requested: 4, cachedReplays: 1 });
    expect(s.scores.performance).toEqual({ median: 50, min: 40, max: 60 });
    expect(s.metrics["total-blocking-time"]).toEqual({ median: 300, min: 200, max: 400 });
  });
});
