import type { Resource, TextResourceContents } from "@modelcontextprotocol/sdk/types.js";
import { getAllBaselines } from "./baselines.js";

/** Built-in MCP Resources surface for PageSpeed Insights knowledge and state. */
export const RESOURCES: Resource[] = [
  {
    uri: "pagespeed://web-vitals-guide",
    name: "Google Core Web Vitals Official Reference Guide",
    description: "Definitive 2026 Core Web Vitals thresholds (Good / Needs Improvement / Poor) for LCP, INP, CLS, FCP, TTFB, and TBT, plus Lab vs Field guidance.",
    mimeType: "text/markdown",
  },
  {
    uri: "pagespeed://baselines",
    name: "Local PageSpeed Stored Baselines",
    description: "Locally recorded performance baselines for regression comparisons and tracking improvements over time.",
    mimeType: "application/json",
  },
];

const WEB_VITALS_GUIDE_MARKDOWN = `# Google Core Web Vitals & Web Performance Reference Guide (2026)

Core Web Vitals are the subset of Web Vitals that apply to all web pages, are measured by all Google tools, and surface in Google Search ranking.

---

## 1. Key Metrics & Evaluation Thresholds (p75)

To pass the Core Web Vitals assessment, a page or origin must reach the **Good (Pass)** threshold for at least 75% of page visits (the 75th percentile) over a 28-day collection window.

| Metric | Target (Good) | Needs Improvement | Poor | Type | What It Measures |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LCP** (Largest Contentful Paint) | **≤ 2.5 s** | 2.5 s – 4.0 s | **> 4.0 s** | Core Vital | Main content loading speed |
| **INP** (Interaction to Next Paint) | **≤ 200 ms** | 200 ms – 500 ms | **> 500 ms** | Core Vital | Overall page responsiveness to user input |
| **CLS** (Cumulative Layout Shift) | **≤ 0.10** | 0.10 – 0.25 | **> 0.25** | Core Vital | Visual stability and unexpected shifts |
| **FCP** (First Contentful Paint) | **≤ 1.8 s** | 1.8 s – 3.0 s | **> 3.0 s** | Diagnostic | Time until the browser renders first DOM text/image |
| **TTFB** (Time to First Byte) | **≤ 800 ms** | 800 ms – 1800 ms | **> 1800 ms** | Diagnostic | Server response latency & initial connection time |
| **TBT** (Total Blocking Time) | **≤ 200 ms** | 200 ms – 600 ms | **> 600 ms** | Lab Vital | Proxy for main-thread blocking time (correlates with INP) |

---

## 2. Lab Data (Lighthouse) vs Field Data (CrUX)

- **Field Data (Chrome UX Report / CrUX)**:
  - Real user measurements aggregated over the previous 28 days.
  - Represents real-world diverse network conditions (4G/5G/Wi-Fi), varied low-end and high-end devices, user battery status, and actual interaction paths.
  - Used by Google for Search ranking factors.

- **Lab Data (Lighthouse)**:
  - Synthetic simulation on a single simulated device profile (Moto G4 on throttled 4G or Desktop).
  - Reproducible, immediate, and debuggable in CI or local development before shipping to production.
  - Does not measure INP (uses Total Blocking Time as a lab proxy instead).

---

## 3. High-Impact Optimization Playbook

### Largest Contentful Paint (LCP)
- Ensure the LCP element (hero image, video poster, or large text block) is discovered early in the HTML document.
- Avoid \`loading="lazy"\` on hero/LCP images; use \`fetchpriority="high"\` instead.
- Eliminate render-blocking CSS and fonts by inlining critical styles and using \`font-display: swap\`.
- Use modern image formats (AVIF, WebP) with proper responsive \`srcset\` definitions.

### Interaction to Next Paint (INP)
- Yield the main thread frequently using \`scheduler.yield()\` or \`setTimeout()\`.
- Avoid long-running JavaScript execution (>50ms) during user click, tap, or keypress handlers.
- Offload heavy compute tasks to Web Workers.
- Minimize layout thrashing by separating DOM reads from DOM writes.

### Cumulative Layout Shift (CLS)
- Always specify \`width\` and \`height\` attributes or CSS \`aspect-ratio\` on images, videos, and iframes.
- Reserve static dimensions for dynamic banner ads or embeds before loading.
- Never insert dynamic content above existing content unless triggered directly by user action.
- Prefer CSS \`transform\` animations over properties that trigger layout recomputation (\`top\`, \`left\`, \`height\`, \`width\`).
`;

export function readResource(uri: string): { contents: TextResourceContents[] } {
  switch (uri) {
    case "pagespeed://web-vitals-guide":
      return {
        contents: [
          {
            uri: "pagespeed://web-vitals-guide",
            mimeType: "text/markdown",
            text: WEB_VITALS_GUIDE_MARKDOWN,
          },
        ],
      };
    case "pagespeed://baselines": {
      const baselines = getAllBaselines();
      return {
        contents: [
          {
            uri: "pagespeed://baselines",
            mimeType: "application/json",
            text: JSON.stringify(baselines, null, 2),
          },
        ],
      };
    }
    default:
      throw new Error(`Resource '${uri}' not found. Available resources: ${RESOURCES.map((r) => r.uri).join(", ")}`);
  }
}
