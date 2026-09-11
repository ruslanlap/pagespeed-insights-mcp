export interface MetricSpread {
  median: number;
  min: number;
  max: number;
}

export interface MultirunStats {
  analyses: number;
  requested: number;
  cachedReplays: number;
}

export interface MultirunResult {
  stats: MultirunStats;
  scores: Record<string, MetricSpread | null>;
  metrics: Record<string, MetricSpread | null>;
  runs: PageSpeedRun[];
}

/**
 * One Lighthouse run is noise: TBT routinely swings 3x between runs on an
 * unchanged page. Report the median of N genuinely distinct analyses, with the
 * min-max spread beside it. A change inside the spread is not a change.
 *
 * Google re-analyses a URL about once a minute and replays the cached result
 * in between — five identical fetchTime stamps is one measurement five times
 * over. Deduplicate on fetchTime, and only count runs that measured something.
 */
export function dedupRuns(runs: PageSpeedRun[]): PageSpeedRun[] {
  const stamps = new Set<string>();
  const unique: PageSpeedRun[] = [];
  for (const run of runs) {
    const stamp = run.lighthouseResult?.fetchTime;
    if (stamp && stamps.has(stamp)) {
      continue;
    }
    if (stamp) stamps.add(stamp);
    unique.push(run);
  }
  return unique;
}

interface PageSpeedRun {
  lighthouseResult?: {
    fetchTime?: string;
    analysisUTCTimestamp?: string;
    categories?: Record<string, { score: number | null }>;
    audits?: Record<string, { numericValue?: number }>;
  };
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function spread(values: number[]): MetricSpread | null {
  if (values.length === 0) return null;
  return { median: median(values), min: Math.min(...values), max: Math.max(...values) };
}

/** Median + spread per category score and per key metric across distinct runs. */
export function summariseMultirun(runs: PageSpeedRun[]): MultirunResult {
  const unique = dedupRuns(runs);
  const stats: MultirunStats = {
    analyses: unique.length,
    requested: runs.length,
    cachedReplays: runs.length - unique.length,
  };
  const scores: Record<string, number[]> = {};
  const metrics: Record<string, number[]> = {};
  for (const run of unique) {
    const lh = run.lighthouseResult;
    if (!lh) continue;
    for (const [cat, v] of Object.entries(lh.categories || {})) {
      if (typeof v.score === "number") (scores[cat] ||= []).push(v.score * 100);
    }
    for (const [id, a] of Object.entries(lh.audits || {})) {
      if (typeof a.numericValue === "number") (metrics[id] ||= []).push(a.numericValue);
    }
  }
  return {
    stats,
    runs: unique,
    scores: Object.fromEntries(
      Object.entries(scores).map(([k, v]) => [k, spread(v)] as const)
    ),
    metrics: Object.fromEntries(
      Object.entries(metrics).map(([k, v]) => [k, spread(v)] as const)
    ),
  };
}
