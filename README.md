# Switas Web Performance MCP

An MCP server that lets Claude and other MCP clients audit web performance with **Google PageSpeed Insights (Lighthouse)**, **Chrome UX Report (real users)** and **WebPageTest (real browsers)**, and turn the measurements into a prioritized fix list.

> **Built on open source.** This project is a fork of [ruslanlap/pagespeed-insights-mcp](https://github.com/ruslanlap/pagespeed-insights-mcp) by [@ruslanlap](https://github.com/ruslanlap), licensed under Apache-2.0. The six `pagespeed_*` tools, prompts and resources come from that project. Switas added the WebPageTest integration and the analysis described below. See [NOTICE](./NOTICE) for the full list of changes.

[![CI](https://github.com/switaslabs/web-performance-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/switaslabs/web-performance-mcp/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)

## What Switas added

PageSpeed Insights runs one emulated test from Google's infrastructure. WebPageTest adds control and depth:

- **Real Chrome at a chosen location and network**: Frankfurt by default (closest to Turkey), throttled 4G/3G/cable, mobile or desktop.
- **LCP phase breakdown**: TTFB, resource load delay, resource load time and element render delay, plus the LCP element and whether it is lazy-loaded.
- **Layout shifts, long tasks and CPU**: which shifts happened when, the longest main-thread tasks and total CPU busy time.
- **Caching diagnosis**: CDN cache status of the HTML (for example `cf-cache-status: BYPASS`) and static assets with short cache lifetimes.
- **Third parties**: bytes and requests per domain, first-party vs third-party.
- **Detected technologies**: e-commerce platform, frameworks, analytics and A/B testing tools.
- **Automatic findings**: heuristics that turn the raw data into actionable statements.
- **What-if experiments**: run the page with and without selected domains (an A/B tool, chat widget or tag) and get the measured difference instead of a guess.
- **Repeat view and scripted flows**: warm-cache second visit and multi-step journeys (for example home → category → product).

## Tools

| Tool | Source | Use it for |
|---|---|---|
| `pagespeed_analyze_page` | upstream | Lighthouse health check, full report, recommendations, audit or Mermaid map for one page. |
| `pagespeed_diagnose_page` | upstream | One focused lens: `visual`, `elements`, `network`, `javascript`, `images`, `render-blocking`, `third-parties`. |
| `pagespeed_get_field_data` | upstream | CrUX real-user Core Web Vitals for a `page` or an `origin`. |
| `pagespeed_compare_pages` | upstream | Compare two pages, or one page against a stored baseline. |
| `pagespeed_analyze_batch` | upstream | Triage 1–10 pages. |
| `pagespeed_clear_cache` | upstream | Clear the in-memory PageSpeed cache. |
| `wpt_run_test` | Switas | Run a WebPageTest test and return metrics, findings and links (result page, filmstrip, waterfall). |
| `wpt_get_result` | Switas | Read a finished test by `testId` through one view: `summary`, `lcp`, `cls`, `long-tasks`, `requests`, `third-parties`, `cache`, `technologies`. |
| `wpt_what_if` | Switas | Baseline vs blocked-domains run in parallel, returned as a metric delta table. |
| `wpt_list_locations` | Switas | Available test locations and the remaining test balance of the key. |

All tools accept `responseFormat` (`markdown` by default, or `json`) and return MCP `structuredContent`.

The upstream prompts (`performance-audit`, `release-comparison`, `core-web-vitals-deepdive`) and resources (`pagespeed://web-vitals-guide`, `pagespeed://baselines`) are unchanged.

## Requirements

- Node.js **20.19.0 or later**.
- A **Google API key** with the PageSpeed Insights API (and optionally the Chrome UX Report API) enabled: [Get started](https://developers.google.com/speed/docs/insights/v5/get-started).
- Optional: a **WebPageTest API key** for the `wpt_*` tools: [WebPageTest API](https://docs.webpagetest.org/api/). Without it the `wpt_*` tools return a clear error and the `pagespeed_*` tools keep working.

## Install

```bash
git clone https://github.com/switaslabs/web-performance-mcp.git
cd web-performance-mcp
npm ci
npm run build
```

### Claude Code

```bash
claude mcp add web-performance -s user \
  -e GOOGLE_API_KEY=your-google-api-key \
  -e WPT_API_KEY=your-webpagetest-api-key \
  -e REQUEST_TIMEOUT=60000 \
  -- node /absolute/path/to/web-performance-mcp/dist/index.js
```

Use the absolute path of a Node.js 20.19+ binary if your default `node` is older.

### Claude Desktop and other MCP clients

Add to `claude_desktop_config.json` (or your client's MCP config), then restart the client:

```json
{
  "mcpServers": {
    "web-performance": {
      "command": "node",
      "args": ["/absolute/path/to/web-performance-mcp/dist/index.js"],
      "env": {
        "GOOGLE_API_KEY": "your-google-api-key",
        "WPT_API_KEY": "your-webpagetest-api-key",
        "REQUEST_TIMEOUT": "60000"
      }
    }
  }
}
```

A Docker variant is in [examples/claude-desktop-config-docker.json](./examples/claude-desktop-config-docker.json) (build it first with `docker build -t web-performance-mcp .`).

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_API_KEY` | yes | – | Google API key for PageSpeed Insights and CrUX. |
| `WPT_API_KEY` | no | – | WebPageTest API key. Sent only as the `X-WPT-API-KEY` header. |
| `REQUEST_TIMEOUT` | no | `30000` | Per-request timeout in ms (1000–60000). Lighthouse runs on heavy pages often need **60000**. |
| `MAX_CONCURRENCY` | no | `3` | Parallel PageSpeed requests (1–10). |
| `RETRY_ATTEMPTS` | no | `3` | Retries for transient API errors (0–5). |
| `CACHE_TTL` | no | `3600` | In-memory PageSpeed cache lifetime in seconds. |
| `LOG_LEVEL` | no | `info` | `trace`, `debug`, `info`, `warn`, `error`, `fatal`. |
| `NODE_ENV` | no | `development` | `production` disables pretty log formatting. |

## Usage examples

Ask your assistant in plain language. For example:

- "Run a full speed and CrUX analysis of example.com: home page, a category page and a product page, mobile and desktop."
- "Run a WebPageTest test on https://example.com/category on mobile 4G from Frankfurt and explain the LCP phases."
- "How much faster would https://example.com be without the A/B testing script? Use wpt_what_if with 3 runs."
- "Show the caching view of WebPageTest test `<testId>`: is the HTML served from the CDN?"

Direct tool calls:

```json
{"url": "https://example.com/category", "device": "mobile", "connectivity": "4G", "location": "FRA_DE_02"}
```

```json
{"testId": "<testId>", "view": "lcp"}
```

```json
{"url": "https://example.com/", "blockDomains": ["dev.visualwebsiteoptimizer.com"], "runs": 3}
```

### How WebPageTest calls behave

- `wpt_run_test` waits for the result by default (usually 1–3 minutes, `maxWaitSeconds` up to 600) and sends MCP progress notifications while it waits. With `wait: false`, or when the wait expires, it returns the `testId`; read it later with `wpt_get_result`.
- Every run uses WebPageTest test balance; `wpt_what_if` uses `2 × runs`.
- Lab results are noisy. Use `runs` ≥ 3 before acting on differences under about 10%.
- The automatic findings are heuristics and starting points, not verdicts. Confirm a suspected cause, for example with `wpt_what_if`, before recommending a change.

## Development

```bash
npm run dev        # run from source with tsx
npm run build      # compile to dist/
npm test           # vitest
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

The WebPageTest code lives in `src/wpt-client.ts` (HTTP client) and `src/wpt-tools.ts` (tool definitions, analysis and rendering). Tests are in `src/tests/`.

## Troubleshooting

- **"This operation was aborted" from `pagespeed_*` tools**: the Lighthouse run exceeded `REQUEST_TIMEOUT`. Set it to `60000`.
- **"WPT_API_KEY is not set"**: add `WPT_API_KEY` to the server's environment and restart the client.
- **PageSpeed `429 Quota exceeded`**: you are calling without a key, or the key's daily quota is used up.
- **CrUX returns no data for `example.com`**: CrUX is keyed by exact origin. Try the canonical host (for example `https://www.example.com`).

## Security

Report vulnerabilities privately, not in a public issue. See [SECURITY.md](./SECURITY.md).

## License and attribution

Apache-2.0: see [LICENSE](./LICENSE) and [NOTICE](./NOTICE).

Original project: [pagespeed-insights-mcp](https://github.com/ruslanlap/pagespeed-insights-mcp) by [@ruslanlap](https://github.com/ruslanlap), with contributions from [@engmsaleh](https://github.com/engmsaleh) and [@system-conf](https://github.com/system-conf). Thank you for making it open source.

"PageSpeed Insights", "Chrome UX Report" and "Lighthouse" are trademarks of Google LLC; "WebPageTest" is a trademark of Catchpoint Systems, Inc. This project is not affiliated with or endorsed by them or by the original author.

Maintained by [Switas](https://switas.com).
