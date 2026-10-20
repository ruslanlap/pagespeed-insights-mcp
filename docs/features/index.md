# Features Overview

The PageSpeed Insights MCP server provides six workflow-oriented tools designed to help developers and AI assistants analyze, diagnose, compare, and optimize web performance.

## 📊 Performance Analysis (`pagespeed_analyze_page`)

Run comprehensive Lighthouse audits across configurable categories and device strategies:

*   **Multi-Category Audits**: Audit Performance, Accessibility, Best Practices, SEO, and PWA scores.
*   **Core Web Vitals**: In-depth lab metrics including LCP (Largest Contentful Paint), CLS (Cumulative Layout Shift), and INP (Interaction to Next Paint) / TBT (Total Blocking Time).
*   **Multi-Run Stability**: Execute 1 to 5 runs to calculate the median run and spread, reducing lab variability.
*   **Tailored Report Types**:
    *   `summary`: Concise overview with scores, Core Web Vitals, and top opportunities.
    *   `full`: Complete Lighthouse audit breakdown.
    *   `recommendations`: Prioritized action plan with estimated byte and time savings.
    *   `audit`: Detailed non-performance audit findings (accessibility, SEO, best practices).
    *   `performance-map`: Visual flowchart using Mermaid syntax illustrating performance relationships.

## 🔍 Targeted Diagnostics (`pagespeed_diagnose_page`)

Instead of dumping massive JSON trees, investigate performance bottlenecks through seven focused diagnostic lenses:

*   **`visual`**: Filmstrip loading progression and final page screenshots.
*   **`elements`**: Specific DOM elements triggering layout shifts (CLS) or slow Largest Contentful Paint (LCP).
*   **`network`**: Resource transfer sizes, compression, HTTP request waterfalls, and latency bottlenecks.
*   **`javascript`**: Main-thread script execution time, boot-up evaluation overhead, and long tasks.
*   **`images`**: Unoptimized images, missing responsive formats (AVIF/WebP), sizing mismatches, and layout shifts.
*   **`render-blocking`**: Critical CSS and synchronous scripts delaying First Contentful Paint.
*   **`third-parties`**: Impact of external tags, trackers, analytics, and widgets on page weight and execution.

## 🌍 Real-World User Field Data (`pagespeed_get_field_data`)

Lab data (Lighthouse) simulates visits under synthetic network conditions. Real-user metrics come from the **Chrome User Experience Report (CrUX)**:

*   **75th Percentile (p75) Metrics**: Real-user distributions for LCP, CLS, INP, and FCP.
*   **Dual Query Scopes**:
    *   `scope=page`: Targeted field data for a specific URL.
    *   `scope=origin`: Aggregate field metrics across the entire origin (domain), essential for newly launched pages or URLs with low traffic.
*   **Device Form Factors**: Filter by `PHONE`, `DESKTOP`, `TABLET`, or `ALL` (origin scope).

## ⚖️ Comparison & Regression Baselines (`pagespeed_compare_pages`)

Track performance deltas across deployments and environments:

*   **Side-by-Side Comparison (`mode=pages`)**: Compare two URLs (e.g. Staging vs. Production, or competitor benchmarking) across all Core Web Vitals.
*   **Baseline Tracking (`mode=baseline`)**: Store an initial performance baseline locally and measure subsequent runs against it. Accurately verify whether code optimizations or dependency updates improved performance or caused regressions.

## 📦 Batch Analysis (`pagespeed_analyze_batch`)

Analyze up to 10 URLs in parallel with progress notifications, returning per-page results alongside aggregate pass/fail statistics. Ideal for auditing top landing pages or sitemaps.

## 🧹 Cache Management (`pagespeed_clear_cache`)

The server caches API responses in-memory with a configurable TTL (default: 1 hour) to preserve API quota. Use `pagespeed_clear_cache` to immediately invalidate the local cache after deploying changes, forcing fresh measurements from Google.

