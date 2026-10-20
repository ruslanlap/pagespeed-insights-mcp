/**
 * Visual & Aesthetic Formatters for PageSpeed Insights MCP outputs.
 * Provides Unicode score bars, status badges, GitHub shield links, and metric cards.
 */

export interface ScoreRating {
  emoji: string;
  label: string;
  color: string;
  hex: string;
}

/**
 * Maps a 0-100 score to official Google Lighthouse rating & color.
 */
export function getScoreRating(score: number | null): ScoreRating {
  if (score === null || isNaN(score)) {
    return { emoji: "❓", label: "Unavailable", color: "inactive", hex: "#64748B" };
  }
  if (score >= 90) {
    return { emoji: "🟢", label: "Good", color: "success", hex: "#10B981" };
  }
  if (score >= 50) {
    return { emoji: "🟠", label: "Needs Improvement", color: "orange", hex: "#F59E0B" };
  }
  return { emoji: "🔴", label: "Poor", color: "critical", hex: "#EF4444" };
}

/**
 * Renders a visual Unicode block progress bar (e.g. `████████████░░░░`).
 */
export function renderScoreBar(score: number | null, width = 16): string {
  if (score === null || isNaN(score)) {
    return "░".repeat(width);
  }
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const filled = Math.round((clamped / 100) * width);
  const empty = Math.max(0, width - filled);
  return "█".repeat(filled) + "░".repeat(empty);
}

/**
 * Returns a ready-to-paste GitHub Markdown badge snippet for repository READMEs.
 */
export function renderShieldBadge(score: number | null, targetUrl: string): string {
  const rating = getScoreRating(score);
  const scoreText = score !== null ? `${score}%2F100` : "N%2FA";
  const encodedTarget = encodeURIComponent(targetUrl);
  return `[![PageSpeed Score](https://img.shields.io/badge/PageSpeed-${scoreText}-${rating.color}?style=flat-square&logo=lighthouse)](https://pagespeed.web.dev/analysis?url=${encodedTarget})`;
}

/**
 * Classifies Core Web Vitals according to official Google 2026 guidelines.
 */
export function evaluateMetric(
  metricId: string,
  numericValue: number | undefined
): { status: "good" | "mediocre" | "poor" | "unknown"; badge: string } {
  if (numericValue === undefined || isNaN(numericValue)) {
    return { status: "unknown", badge: "⚪ Unknown" };
  }

  const thresholds: Record<string, { good: number; mediocre: number }> = {
    "largest-contentful-paint": { good: 2500, mediocre: 4000 },
    "largest_contentful_paint": { good: 2500, mediocre: 4000 },
    "interaction-to-next-paint": { good: 200, mediocre: 500 },
    "interaction_to_next_paint": { good: 200, mediocre: 500 },
    "first-input-delay": { good: 100, mediocre: 300 },
    "cumulative-layout-shift": { good: 0.1, mediocre: 0.25 },
    "cumulative_layout_shift": { good: 0.1, mediocre: 0.25 },
    "first-contentful-paint": { good: 1800, mediocre: 3000 },
    "first_contentful_paint": { good: 1800, mediocre: 3000 },
    "total-blocking-time": { good: 200, mediocre: 600 },
    "speed-index": { good: 3400, mediocre: 5800 },
    "experimental_time_to_first_byte": { good: 800, mediocre: 1800 },
  };

  const limit = thresholds[metricId];
  if (!limit) {
    return { status: "unknown", badge: "⚪ Neutral" };
  }

  if (numericValue <= limit.good) {
    return { status: "good", badge: "🟢 Good" };
  }
  if (numericValue <= limit.mediocre) {
    return { status: "mediocre", badge: "🟡 Needs Improvement" };
  }
  return { status: "poor", badge: "🔴 Poor" };
}

/**
 * Generates an aesthetic mini scorecard table for Core Web Vitals.
 */
export function renderCwvTable(
  metrics: Array<{ name: string; id: string; display: string; value?: number; target: string }>
): string {
  let table = `| Core Web Vital | Lab Value | Status | Target Threshold |\n`;
  table += `| :--- | :---: | :---: | :---: |\n`;

  for (const m of metrics) {
    const evaluation = evaluateMetric(m.id, m.value);
    table += `| **${m.name}** | \`${m.display}\` | ${evaluation.badge} | \`${m.target}\` |\n`;
  }

  return table;
}
