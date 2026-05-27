# PageSpeed Insights MCP Server

<p align="center">
  <img src="https://raw.githubusercontent.com/ruslanlap/pagespeed-insights-mcp/master/1.png" alt="PageSpeed MCP chat demo" width="48%" />
  <img src="https://raw.githubusercontent.com/ruslanlap/pagespeed-insights-mcp/master/2.png" alt="PageSpeed MCP terminal demo" width="48%" />
</p>

[![npm version](https://img.shields.io/npm/v/pagespeed-insights-mcp.svg)](https://www.npmjs.com/package/pagespeed-insights-mcp)
[![npm downloads](https://img.shields.io/npm/dm/pagespeed-insights-mcp.svg)](https://www.npmjs.com/package/pagespeed-insights-mcp)
[![GitHub Package Version](https://img.shields.io/github/package-json/v/ruslanlap/pagespeed-insights-mcp?label=github%20package)](https://github.com/ruslanlap/pagespeed-insights-mcp/pkgs/npm/pagespeed-insights-mcp)
[![CI](https://github.com/ruslanlap/pagespeed-insights-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/ruslanlap/pagespeed-insights-mcp/actions/workflows/ci.yml)
[![Documentation](https://img.shields.io/badge/docs-online-blue.svg)](https://ruslanlap.github.io/pagespeed-insights-mcp/)
[![Live Demo](https://img.shields.io/badge/demo-live-blueviolet.svg)](https://ruslanlap.github.io/pagespeed-insights-mcp/demo/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**16-tool MCP server** for Google PageSpeed Insights & Chrome UX Report APIs. Analyze, compare, and optimize web performance directly through Claude, Cursor, or any MCP-compatible AI client.

> **🎬 [View Interactive Demo →](https://ruslanlap.github.io/pagespeed-insights-mcp/demo/)** — See all 16 tools in action with animated examples
> Fallback URL: [https://ruslanlap.github.io/pagespeed-insights-mcp/demo.html](https://ruslanlap.github.io/pagespeed-insights-mcp/demo.html)

## 📖 Table of Contents

- [⚡ Quick Start (Copy & Paste)](#-quick-start-copy--paste)
  - [Claude Desktop](#claude-desktop)
  - [Codex / OpenAI](#codex--openai)
- [📚 Documentation](#-documentation)
- [✨ Features](#-features)
  - [Core Features](#core-features)
  - [Advanced Analysis Tools (New!)](#advanced-analysis-tools-new)
- [🚀 Quick Installation](#-quick-installation)
  - [Option 1: Automatic Installation (Recommended)](#option-1-automatic-installation-recommended)
  - [Option 2: Via npm or GitHub Packages](#option-2-via-npm-or-github-packages)
    - [From npm (Public Registry)](#from-npm-public-registry)
    - [From GitHub Packages](#from-github-packages)
  - [🔧 Configuration](#-configuration)
  - [📝 MCP Configuration Examples](#-mcp-configuration-examples)
    - [For Claude Desktop](#for-claude-desktop-with-pino-pretty-logging)
    - [For Codex](#for-codex-with-pino-pretty-logging)
  - [Claude Desktop Configuration](#claude-desktop-configuration)
  - [Option 3: Docker](#option-3-docker)
- [🔑 Getting Google API Key](#-getting-google-api-key)
- [⚙️ Claude Desktop Configuration](#-claude-desktop-configuration)
  - [Automatic Configuration](#automatic-configuration)
  - [Manual Configuration](#manual-configuration)
    - [For npm / Global Installation](#for-npm-installation-and-global-installation)
    - [For GitHub Packages](#for-github-packages-installation)
    - [For Docker](#for-docker)
- [💻 Usage](#-usage)
  - [🔍 Full Page Analysis](#-full-page-analysis)
  - [📱 Mobile Device Analysis](#-mobile-device-analysis)
  - [⚡ Quick Performance Overview](#-quick-performance-overview)
  - [🖥️ Desktop Analysis](#-desktop-analysis)
  - [🌐 Multi-Category Analysis](#-multi-category-analysis)
  - [🎯 Smart Performance Recommendations](#-smart-performance-recommendations)
  - [💾 Cache Management](#-cache-management)
  - [📸 Visual Analysis](#-visual-analysis)
  - [🎯 Element-Level Debugging](#-element-level-debugging)
  - [🌐 Network Waterfall Analysis](#-network-waterfall-analysis)
  - [⚡ JavaScript Performance](#-javascript-performance)
  - [🖼️ Image Optimization Opportunities](#-image-optimization-opportunities)
  - [🚫 Render-Blocking Resources](#-render-blocking-resources)
  - [🔌 Third-Party Script Impact](#-third-party-script-impact)
  - [📊 Full Lighthouse Audit](#-full-lighthouse-audit)
- [🛠️ Available Tools](#available-tools)
  - [Core Analysis](#core-analysis)
  - [CrUX & Comparison](#crux--comparison)
  - [Advanced Diagnostics](#advanced-diagnostics)
- [📊 Complete Ratings for example.com](#complete-ratings-for-examplecom)
- [💻 Development](#development)
- [🔧 Troubleshooting](#troubleshooting)
- [📋 Requirements](#requirements)
- [🔒 Security](#security)
- [🙏 Acknowledgments](#acknowledgments)
- [📄 License](#license)
- [💬 Support](#support)

---

## ⚡ Quick Start (Copy & Paste)

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pagespeed-insights": {
      "command": "npx",
      "args": ["-y", "-p", "pino-pretty", "-p", "pagespeed-insights-mcp", "pagespeed-insights-mcp"],
      "env": {
        "GOOGLE_API_KEY": "your-google-api-key-here"
      }
    }
  }
}
```

### Codex / OpenAI

Add to your configuration (TOML):

```toml
[mcp_servers.pagespeed-insights]
command = "npx"
args = [
  "-y",
  "-p",
  "pino-pretty",
  "-p",
  "pagespeed-insights-mcp",
  "pagespeed-insights-mcp"
]
env = { GOOGLE_API_KEY = "your-google-api-key-here" }
```

> **Note:** The `pino-pretty` package is required for proper log formatting. The above configurations ensure it is installed automatically via `npx`.

## 📚 Documentation

We have comprehensive documentation available online.

[**👉 View Full Documentation Site**](https://ruslanlap.github.io/pagespeed-insights-mcp/)

- [🚀 **Getting Started**](https://ruslanlap.github.io/pagespeed-insights-mcp/getting-started/)
- [🛠️ **Tools Reference**](https://ruslanlap.github.io/pagespeed-insights-mcp/features/tools/)
- [🏗️ **Architecture**](https://ruslanlap.github.io/pagespeed-insights-mcp/developers/architecture/)

> You can also view the raw markdown files in the `docs/` directory or run `mkdocs serve` locally.

## ✨ Features

### Core Features

- 🚀 **Performance Analysis** of web pages using Google PageSpeed Insights
- 📱 **Multi-platform Support**: mobile and desktop devices
- 🔍 **Detailed Lighthouse Reports** with comprehensive metrics
- 📊 **Simplified Reports** with key performance indicators
- 🎯 **Smart Recommendations** with priority scoring and actionable fixes
- 💾 **Intelligent Caching** to reduce API calls and improve performance
- 🌍 **Localization** - support for multiple languages
- ⚡ **Quick Installation** - one command setup
- 🐳 **Docker Support** for containerized deployment

### Advanced Analysis Tools (New!)

- 📸 **Visual Analysis** - Screenshots, filmstrip, and full-page captures
- 🎯 **Element-Level Debugging** - Find specific DOM elements causing issues
- 🌐 **Network Waterfall** - Detailed request timing and resource loading
- ⚡ **JavaScript Profiling** - Execution breakdown and unused code detection
- 🖼️ **Image Optimization** - Specific image issues with exact savings
- 🚫 **Render-Blocking Analysis** - Critical request chains and dependencies
- 🔌 **Third-Party Impact** - Script impact grouped by provider
- 📊 **Full Audits** - Complete Lighthouse audits for all categories

## 🚀 Quick Installation

### Option 1: Automatic Installation (Recommended)

```bash
# Set environment variable
export GOOGLE_API_KEY=your-google-api-key
```

```bash
curl -sSL https://raw.githubusercontent.com/ruslanlap/pagespeed-insights-mcp/master/install.sh | bash
```

### Option 2: Via npm or GitHub Packages

#### From npm (Public Registry)

```bash
# Global installation from npm
npm install -g pagespeed-insights-mcp

# Or use without installation
npx pagespeed-insights-mcp
```

#### From GitHub Packages

```bash
# First configure authentication (see GITHUB_PACKAGES.md for details)
# Then install globally
npm install -g @ruslanlap/pagespeed-insights-mcp
```

> **Note:** This package is available on both npm and GitHub Packages.
>
> - For npm: Use `npm install pagespeed-insights-mcp`
> - For GitHub Packages: Use `npm install @ruslanlap/pagespeed-insights-mcp` (requires GitHub authentication)
>
> For detailed instructions on installing from GitHub Packages, see [GITHUB_PACKAGES.md](GITHUB_PACKAGES.md) or visit the [GitHub Packages page](https://github.com/ruslanlap/pagespeed-insights-mcp/pkgs/npm/pagespeed-insights-mcp)

### 🔧 Configuration

The MCP server requires a Google API key to access the PageSpeed Insights API.

```bash
# Set environment variable
export GOOGLE_API_KEY=your-google-api-key

# Windows
$env:GOOGLE_API_KEY="your-google-api-key"

# Or pass directly when running
GOOGLE_API_KEY=your-google-api-key npx pagespeed-insights-mcp
```

### 📝 MCP Configuration Examples

#### For Claude Desktop (with pino-pretty logging):

```json
"pagespeed-insights": {
  "command": "npx",
  "args": [
    "-y",
    "-p",
    "pino-pretty",
    "-p",
    "pagespeed-insights-mcp",
    "pagespeed-insights-mcp"
  ],
  "env": {
    "GOOGLE_API_KEY": "your-google-api-key-here"
  }
}
```

#### For Codex (with pino-pretty logging):

```toml
[mcp_servers.pagespeed-insights]
command = "npx"
args = [
  "-y",
  "-p",
  "pino-pretty",
  "-p",
  "pagespeed-insights-mcp",
  "pagespeed-insights-mcp"
]
env = { GOOGLE_API_KEY = "your-google-api-key-here" }
```

> **Note:** These examples include `pino-pretty` for better log formatting. For production use without pretty logs, see the [Logging section](#logging--pino-pretty-in-mcp-environments) below.

### Claude Desktop Configuration

To use this MCP server with Claude Desktop, add the following to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "pagespeed-insights": {
      "command": "npx",
      "args": ["-y", "-p", "pino-pretty", "-p", "pagespeed-insights-mcp", "pagespeed-insights-mcp"],
      "env": {
        "GOOGLE_API_KEY": "your-google-api-key-here"
      }
    }
  }
}
```

Example configuration files are available in the [examples](./examples/) directory.

### Option 3: Docker

```bash
docker build -t pagespeed-insights-mcp .
docker run -e GOOGLE_API_KEY=your-key pagespeed-insights-mcp
```

## 🔑 Getting Google API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable PageSpeed Insights API:
   - Navigate to "APIs & Services" → "Library"
   - Search for "PageSpeed Insights API" and enable it
4. Create an API key:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the generated key

## ⚙️ Claude Desktop Configuration

### Automatic Configuration

If you used the install.sh script, the configuration was created automatically.

### Manual Configuration

Add the configuration to your Claude Desktop file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
**Linux:** `~/.config/claude/claude_desktop_config.json`

#### For npm installation and global installation

```json
{
  "mcpServers": {
    "pagespeed-insights": {
      "command": "npx",
      "args": ["-y", "-p", "pino-pretty", "-p", "pagespeed-insights-mcp", "pagespeed-insights-mcp"],
      "env": {
        "GOOGLE_API_KEY": "your-google-api-key-here"
      }
    }
  }
}
```

#### For GitHub Packages installation

```json
{
  "mcpServers": {
    "pagespeed-insights": {
      "command": "npx",
      "args": [
        "-y",
        "-p",
        "pino-pretty",
        "-p",
        "@ruslanlap/pagespeed-insights-mcp",
        "pagespeed-insights-mcp"
      ],
      "env": {
        "GOOGLE_API_KEY": "your-google-api-key-here"
      }
    }
  }
}
```

#### For Docker:

```json
{
  "mcpServers": {
    "pagespeed-insights": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "--env",
        "GOOGLE_API_KEY=your-google-api-key-here",
        "pagespeed-insights-mcp"
      ]
    }
  }
}
```

**Restart Claude Desktop** after configuration!

## 💻 Usage

After configuration, simply ask Claude any of these commands:

### 🔍 Full page analysis

```
Analyze the performance of https://example.com
```

### 📱 Mobile device analysis

```
Analyze https://example.com for mobile devices with all categories
```

### ⚡ Quick performance overview

```
Get a quick performance report for https://example.com
```

### 🖥️ Desktop analysis

```
Analyze https://example.com performance for desktop devices
```

### 🌐 Multi-category analysis

```
Perform a full audit of https://example.com including SEO, accessibility, and best practices
```

### 🎯 Smart performance recommendations

```
Get smart recommendations for improving https://example.com performance
```

### 💾 Cache management

```
Clear the cache to get fresh data for all subsequent requests
```

### 📸 Visual analysis

```
Get visual analysis for https://example.com showing screenshots and loading timeline
```

### 🎯 Element-level debugging

```
Show me which specific elements are causing performance issues on https://example.com
```

### 🌐 Network waterfall analysis

```
Analyze the network requests and resource loading for https://example.com
```

### ⚡ JavaScript performance

```
Get JavaScript execution breakdown for https://example.com
```

### 🖼️ Image optimization opportunities

```
Show me which images need optimization on https://example.com
```

### 🚫 Render-blocking resources

```
Find render-blocking resources on https://example.com
```

### 🔌 Third-party script impact

```
Analyze third-party script impact on https://example.com performance
```

### 📊 Full Lighthouse audit

```
Run a full audit including accessibility, SEO, and best practices for https://example.com
```

## Available Tools

16 tools across three categories:

### Core Analysis

| Tool | Description |
|------|-------------|
| `analyze_page_speed` | Full Lighthouse analysis — all metrics and audits |
| `get_performance_summary` | Simplified key-metrics report |
| `get_recommendations` | Prioritized recommendations with actionable fixes |
| `full_report` | Unified report combining Lighthouse lab data with CrUX field data |
| `batch_analyze` | Analyze up to 10 URLs in parallel with progress tracking |
| `clear_cache` | Clear internal cache to force fresh API requests |

### CrUX & Comparison

| Tool | Description |
|------|-------------|
| `crux_summary` | Real-world Core Web Vitals from Chrome UX Report (field data) |
| `compare_pages` | Side-by-side performance comparison between two URLs |

### Advanced Diagnostics

| Tool | Description |
|------|-------------|
| `get_visual_analysis` | Screenshots, filmstrip, and full-page captures |
| `get_element_analysis` | LCP/CLS DOM elements causing performance issues |
| `get_network_analysis` | Network waterfall — all requests with timing and size |
| `get_javascript_analysis` | JS bootup time, main-thread work, unused & duplicated modules |
| `get_image_optimization_details` | Images needing optimization with exact savings |
| `get_render_blocking_details` | Render-blocking resources and critical request chains |
| `get_third_party_impact` | Third-party script impact grouped by provider |
| `get_full_audit` | Complete Lighthouse audit for all categories |

---

### `analyze_page_speed`

Complete page analysis with all Lighthouse metrics.

**Parameters:**

- `url` (required): URL of the page to analyze
- `strategy`: "mobile" or "desktop" (default: "mobile")
- `category`: array of categories ["performance", "accessibility", "best-practices", "seo", "pwa"]
- `locale`: locale for results (default: "en")

### `get_performance_summary`

Simplified report with key performance metrics.

### `get_recommendations`

Generate smart performance recommendations with priority scoring and actionable fixes.

**Parameters:**

- `url` (required): URL of the page to analyze
- `strategy`: "mobile" or "desktop" (default: "mobile")
- `category`: array of categories to analyze (default: ["performance", "accessibility", "best-practices", "seo"])
- `locale`: locale for results (default: "en")

### `clear_cache`

Clear the internal cache to force fresh API requests for all subsequent analyses.

### `get_visual_analysis`

Get screenshots and visual timeline showing how the page loads.

**Parameters:**

- `url` (required): URL of the page to analyze
- `strategy`: "mobile" or "desktop" (default: "mobile")

**Returns:**

- Final screenshot of the loaded page
- Filmstrip showing page load progression
- Full-page screenshot with DOM node mapping

### `get_element_analysis`

Get specific DOM elements causing performance issues.

**Parameters:**

- `url` (required): URL of the page to analyze
- `strategy`: "mobile" or "desktop" (default: "mobile")

**Returns:**

- LCP (Largest Contentful Paint) element details
- CLS (Cumulative Layout Shift) causing elements
- Lazy-loaded LCP warnings

### `get_network_analysis`

Get detailed network waterfall showing all requests with timing and size.

**Parameters:**

- `url` (required): URL of the page to analyze
- `strategy`: "mobile" or "desktop" (default: "mobile")

**Returns:**

- All network requests with timing data
- Resource breakdown by type
- Total transfer size and request count
- Network RTT and server latency

### `get_javascript_analysis`

Get JavaScript execution breakdown showing performance impact.

**Parameters:**

- `url` (required): URL of the page to analyze
- `strategy`: "mobile" or "desktop" (default: "mobile")

**Returns:**

- JavaScript bootup time by script
- Main thread work breakdown
- Unused JavaScript analysis
- Duplicated JavaScript modules

### `get_image_optimization_details`

Get specific images needing optimization with exact savings potential.

**Parameters:**

- `url` (required): URL of the page to analyze
- `strategy`: "mobile" or "desktop" (default: "mobile")

**Returns:**

- Improperly sized images
- Offscreen images (lazy-loading candidates)
- Unoptimized images
- Modern format recommendations (WebP/AVIF)

### `get_render_blocking_details`

Get render-blocking resources and critical request chains.

**Parameters:**

- `url` (required): URL of the page to analyze
- `strategy`: "mobile" or "desktop" (default: "mobile")

**Returns:**

- Render-blocking CSS and JavaScript files
- Critical request chains showing dependencies
- Total blocking time

### `get_third_party_impact`

Get third-party script impact analysis grouped by entity.

**Parameters:**

- `url` (required): URL of the page to analyze
- `strategy`: "mobile" or "desktop" (default: "mobile")

**Returns:**

- Impact by provider (Google, Facebook, etc.)
- Transfer size and blocking time per provider
- Recommended facade replacements

### `get_full_audit`

Get comprehensive audit results for all Lighthouse categories.

**Parameters:**

- `url` (required): URL of the page to analyze
- `strategy`: "mobile" or "desktop" (default: "mobile")
- `categories`: array of categories to audit (default: ["performance", "accessibility", "best-practices", "seo"])

**Returns:**

- Scores for all categories
- Detailed Core Web Vitals and metrics
- Key failing audits for each category
- Framework-specific advice (if applicable)

### `crux_summary`

Get real-world Core Web Vitals from the Chrome UX Report (field data from actual Chrome users).

**Parameters:**

- `url` (required): URL to analyze
- `formFactor`: "PHONE", "DESKTOP", or "TABLET" (default: "PHONE")

**Returns:**

- Real-world LCP, CLS, FID, INP, TTFB distributions
- Pass/fail thresholds per Core Web Vital
- Percentile breakdowns (p75)

### `compare_pages`

Compare performance metrics between two URLs side-by-side.

**Parameters:**

- `urlA` (required): First URL to compare
- `urlB` (required): Second URL to compare
- `strategy`: "mobile" or "desktop" (default: "mobile")

**Returns:**

- Side-by-side Lighthouse score comparison
- Metric-level diff for LCP, CLS, FCP, TBT, SI
- Winner/loser indication per metric

### `full_report`

Unified report combining Lighthouse lab data with CrUX real-world field data.

**Parameters:**

- `url` (required): URL to analyze
- `strategy`: "mobile" or "desktop" (default: "mobile")

**Returns:**

- Lighthouse lab scores + CrUX field data in one response
- Lab vs. field comparison for Core Web Vitals
- Actionable recommendations

### `batch_analyze`

Analyze performance for multiple URLs with progress tracking.

**Parameters:**

- `urls` (required): Array of URLs to analyze (max 10)
- `strategy`: "mobile" or "desktop" (default: "mobile")

**Returns:**

- Performance scores for all URLs
- Sorted ranking by score
- Per-URL metric breakdown

---

### Example

answer example from Claude Desktop with pagespeed-insights-mcp 🔥🔥🔥

## Complete Ratings for example.com

Now I have the full analysis! Here are all the ratings:

### 📊 **Main Lighthouse Scores**

| Category           | Score       | Status               |
| ------------------ | ----------- | -------------------- |
| **Performance**    | **67/100**  | 🟡 Needs Improvement |
| **Accessibility**  | **92/100**  | 🟢 Good              |
| **Best Practices** | **96/100**  | 🟢 Excellent         |
| **SEO**            | **100/100** | 🟢 Perfect           |

### ⚡ **Detailed Performance Metrics**

| Metric                       | Value | Score                         |
| ---------------------------- | ----- | ----------------------------- |
| **First Contentful Paint**   | 1.2s  | 🟢 Excellent (98/100)         |
| **Largest Contentful Paint** | 2.4s  | 🟡 Needs Improvement (75/100) |
| **Speed Index**              | 4.8s  | 🟡 Needs Improvement (67/100) |
| **Total Blocking Time**      | 60ms  | 🟢 Good (94/100)              |
| **Cumulative Layout Shift**  | 0     | 🟢 Perfect (100/100)          |

### ♿ **Detailed Accessibility Scores (92/100)**

| Audit                           | Score    | Description                |
| ------------------------------- | -------- | -------------------------- |
| **Label Content Name Mismatch** | 🔴 0/1   | 2 errors with aria-label   |
| **Unsized Images**              | 🟡 0.5/1 | 1 image without dimensions |
| **Color Contrast**              | 🟢 1/1   | Sufficient contrast        |
| **Button Names**                | 🟢 1/1   | Accessible button names    |
| **Link Names**                  | 🟢 1/1   | Accessible link names      |
| **ARIA Roles**                  | 🟢 1/1   | Correct ARIA roles         |
| **HTML Lang**                   | 🟢 1/1   | Valid lang attribute       |
| **Meta Viewport**               | 🟢 1/1   | Proper viewport            |
| **Image Alt Text**              | 🟢 1/1   | Correct alt attributes     |
| **List Items**                  | 🟢 1/1   | Proper list structure      |

### 🏆 **Detailed Best Practices Scores (96/100)**

| Audit                        | Score  | Status                   |
| ---------------------------- | ------ | ------------------------ |
| **Uses HTTPS**               | 🟢 ✓   | HTTPS is used            |
| **HTTP Status Code**         | 🟢 1/1 | Correct 200 status       |
| **No Console Errors**        | 🟢 1/1 | No console errors        |
| **Valid Source Maps**        | 🟢 1/1 | Valid source maps        |
| **No Notification Requests** | 🟢 1/1 | No notification requests |
| **Charset Declaration**      | 🟢 1/1 | Correct encoding         |
| **No Inspector Issues**      | 🟢 1/1 | No DevTools issues       |

### 🔍 **Detailed SEO Scores (100/100)**

| Audit                | Score  | Status                      |
| -------------------- | ------ | --------------------------- |
| **Meta Viewport**    | 🟢 1/1 | Mobile optimized            |
| **Document Title**   | 🟢 1/1 | Title present               |
| **Meta Description** | 🟢 1/1 | Description present         |
| **HTTP Status Code** | 🟢 1/1 | Successful status           |
| **Link Text**        | 🟢 1/1 | Descriptive link texts      |
| **Crawlability**     | 🟢 1/1 | Available for indexing      |
| **HTML Lang**        | 🟢 1/1 | Valid document language     |
| **Hreflang**         | 🟢 1/1 | Correct hreflang attributes |

### 🔧 **Main Performance Issues**

| Issue                         | Affects       | Potential Savings |
| ----------------------------- | ------------- | ----------------- |
| **Improperly sized images**   | LCP, FCP      | 1,069 KB, 170ms   |
| **Inefficient caching**       | Overall speed | 1,445 KB          |
| **Forced Reflows**            | Smoothness    | 46.8ms            |
| **JavaScript execution time** | TBT           | 338ms             |

### 📈 **Network Metrics**

| Metric                   | Value                  |
| ------------------------ | ---------------------- |
| **Server Response Time** | 120ms (🟢 Good)        |
| **Network RTT**          | Minimal                |
| **Main Thread Work**     | 0.9s                   |
| **DOM Size**             | 453 elements (optimal) |

### 💡 **Priority Recommendations**

1. **🔴 High Priority:**
   - Optimize image sizes (save 1+ MB)
   - Fix aria-label mismatches for accessibility
2. **🟡 Medium Priority:**
   - Improve caching policy (TTL >600s)
   - Add width/height attributes for images
3. **🟢 Low Priority:**
   - Optimize forced reflows in JavaScript

### 🎯 **Summary**

**Overall Rating: Good with potential for improvement**

- **SEO**: Perfect (100/100) 🏆
- **Best Practices**: Excellent (96/100) 🏆
- **Accessibility**: Good (92/100) ✅
- **Performance**: Needs attention (67/100) ⚠️

The site has excellent SEO optimization and follows best practices, but needs image optimization to improve performance.

**Parameters:**

- `url` (required): URL of the page to analyze
- `strategy`: "mobile" or "desktop" (default: "mobile")

## Development

For better log formatting during development, it is recommended to install `pino-pretty` globally:

```bash
npm install -g pino-pretty
```

```bash
# Development mode
npm run dev

# Build project
npm run build

# Run built server
npm start
```

### Logging / `pino-pretty` in MCP environments

This MCP server uses `pino` for logging and enables the `pino-pretty` transport when `NODE_ENV=development`.

- If you **just want it to work with minimal setup** (Claude, Codex, etc.), set:

```bash
NODE_ENV=production GOOGLE_API_KEY=your-google-api-key npx pagespeed-insights-mcp
```

or in your MCP config:

```jsonc
"pagespeed-insights": {
  "command": "npx",
  "args": ["pagespeed-insights-mcp"],
  "env": {
    "GOOGLE_API_KEY": "your-google-api-key-here",
    "NODE_ENV": "production"
  }
}
```

- If you **want pretty logs in development via `npx`**, you can have `npx` install `pino-pretty` alongside the server:

```jsonc
"pagespeed-insights": {
  "command": "npx",
  "args": [
    "-y",
    "-p",
    "pino-pretty",
    "-p",
    "pagespeed-insights-mcp",
    "pagespeed-insights-mcp"
  ],
  "env": {
    "GOOGLE_API_KEY": "your-google-api-key-here"
  }
}
```

## Troubleshooting

### "Google API key not provided"

Ensure the `GOOGLE_API_KEY` environment variable is set in your Claude Desktop configuration.

### "PageSpeed Insights API error: 403"

Check if PageSpeed Insights API is enabled in your Google Cloud project.

### "Invalid URL"

Ensure the URL includes the protocol — only `http://` and `https://` are accepted. Other schemes (`file://`, `ftp://`, `javascript:`, etc.) are rejected at the schema level.

## Requirements

- Node.js **20 or later** (Node 18 is EOL since April 2025 and is no longer supported).
- A Google API key with PageSpeed Insights and (optionally) Chrome UX Report APIs enabled.

## Security

Please report security issues privately — do **not** open a public issue. See [SECURITY.md](./SECURITY.md) for the disclosure policy and operator hardening notes.

## Acknowledgments

Special thanks to [@engmsaleh](https://github.com/engmsaleh) (Mohamed Saleh Zaied) for his significant contribution to the development of this project.

A very special thank you to [@system-conf](https://github.com/system-conf) for their outstanding and invaluable contribution to the growth and development of this project. Your dedication, expertise, and continuous support have made a tremendous impact — this project wouldn't be where it is today without you. 🙏

## License

MIT

## Support

For bug reports or feature requests, please create an issue in the repository.
