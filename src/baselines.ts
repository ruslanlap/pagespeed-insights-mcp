import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { MetricSpread } from "./multirun.js";

/**
 * Baselines for "did that change actually help" comparisons, persisted under
 * ~/.pagespeed-mcp/baselines.json keyed by url+strategy. The first call on a
 * URL records the baseline; later calls compare against it. Verdicts are only
 * given where the two min-max ranges do NOT overlap — comparing medians alone
 * reports improvements that are just the instrument moving.
 */

interface Snapshot {
  recorded: string;
  lighthouseVersion?: string;
  scores: Record<string, MetricSpread>;
  metrics: Record<string, MetricSpread>;
}

interface Baselines {
  [key: string]: Snapshot;
}

function baselinesPath(): string {
  const root = process.env.PAGESPEED_BASELINES_DIR || join(homedir(), ".pagespeed-mcp");
  return join(root, "baselines.json");
}

function load(): Baselines {
  try {
    return JSON.parse(readFileSync(baselinesPath(), "utf8"));
  } catch {
    return {};
  }
}

function saveAll(b: Baselines): void {
  const dir = join(baselinesPath(), "..");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(baselinesPath(), JSON.stringify(b, null, 2));
}

export function getBaseline(url: string, strategy: string): Snapshot | null {
  return load()[`${url}|${strategy}`] ?? null;
}

export function saveBaseline(
  url: string,
  strategy: string,
  multirun: { stats: any; scores: Record<string, MetricSpread | null>; metrics: Record<string, MetricSpread | null> },
  lighthouseVersion?: string
): Snapshot {
  const snap: Snapshot = {
    recorded: new Date().toISOString(),
    lighthouseVersion,
    scores: Object.fromEntries(Object.entries(multirun.scores).filter(([, v]) => v)) as Record<string, MetricSpread>,
    metrics: Object.fromEntries(Object.entries(multirun.metrics).filter(([, v]) => v)) as Record<string, MetricSpread>,
  };
  const all = load();
  all[`${url}|${strategy}`] = snap;
  saveAll(all);
  return snap;
}

export function clearBaseline(url: string, strategy: string): void {
  const all = load();
  delete all[`${url}|${strategy}`];
  saveAll(all);
}

export interface RangeVerdict {
  metric: string;
  before: MetricSpread;
  after: MetricSpread;
  verdict: "improved" | "regressed" | "no-verdict";
  medianDelta: number;
  guaranteedDelta: number;
}

function overlap(a: MetricSpread, b: MetricSpread): boolean {
  return a.min <= b.max && b.min <= a.max;
}

/**
 * Compare two snapshots. A verdict is only given where the ranges are
 * completely disjoint; `guaranteedDelta` is the smaller figure the gap
 * actually guarantees (max(before.min - after.max, 0) style) and is the one
 * to quote.
 */
export function compareBaselines(before: Snapshot, after: Snapshot): RangeVerdict[] {
  const out: RangeVerdict[] = [];
  const keys = Object.keys({...before.scores, ...after.scores});
  for (const k of keys) {
    const b = before.scores[k];
    const a = after.scores[k];
    if (!b || !a) continue;
    out.push(verdict(k, b, a, k === "performance"));
  }
  const metricKeys = Object.keys({...before.metrics, ...after.metrics});
  for (const k of metricKeys) {
    const b = before.metrics[k];
    const a = after.metrics[k];
    if (!b || !a) continue;
    out.push(verdict(k, b, a, false));
  }
  return out;
}

function verdict(metric: string, b: MetricSpread, a: MetricSpread, higherIsBetter: boolean): RangeVerdict {
  const overlap_ = overlap(b, a);
  const medianDelta = a.median - b.median;
  // What the disjoint ranges actually guarantee (0 when they overlap):
  const guaranteed = overlap_
    ? 0
    : higherIsBetter
      ? Math.min(a.min - b.max, a.median - b.median)
      : Math.min(b.min - a.max, b.median - a.median);
  return {
    metric,
    before: b,
    after: a,
    verdict: overlap_ ? "no-verdict" : medianDelta > 0 === higherIsBetter ? "improved" : "regressed",
    medianDelta,
    guaranteedDelta: Math.max(guaranteed, overlap_ ? 0 : guaranteed),
  };
}
