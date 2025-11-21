# PageSpeed Insights MCP Server

[![npm version](https://img.shields.io/npm/v/pagespeed-insights-mcp.svg)](https://www.npmjs.com/package/pagespeed-insights-mcp)
[![GitHub Package Version](https://img.shields.io/github/package-json/v/ruslanlap/pagespeed-insights-mcp?label=github%20package)](https://github.com/ruslanlap/pagespeed-insights-mcp/pkgs/npm/pagespeed-insights-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MCP server for Google PageSpeed Insights API that enables web page performance analysis directly through Claude.

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

# Specific version
npm install -g pagespeed-insights-mcp@1.0.6
```

#### From GitHub Packages
```bash
# First configure authentication (see GITHUB_PACKAGES.md for details)
# Then install globally
npm install -g @ruslanlap/pagespeed-insights-mcp

# Or specific version
npm install -g @ruslanlap/pagespeed-insights-mcp@1.0.6
```

> **Note:** This package is available on both npm and GitHub Packages.
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

### Claude Desktop Configuration

To use this MCP server with Claude Desktop, add the following to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
     "pagespeed": {
      "command": "pagespeed-insights-mcp",
      "args": [],
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
      "args": ["pagespeed-insights-mcp"],
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
      "args": ["@ruslanlap/pagespeed-insights-mcp"],
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
        "run", "--rm", "-i",
        "--env", "GOOGLE_API_KEY=your-google-api-key-here",
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


### Example
answer example from Claude Desktop with pagespeed-insights-mcp 🔥🔥🔥

## Complete Ratings for example.com

Now I have the full analysis! Here are all the ratings:

### 📊 **Main Lighthouse Scores**

| Category | Score | Status |
| --- | --- | --- |
| **Performance** | **67/100** | 🟡 Needs Improvement |
| **Accessibility** | **92/100** | 🟢 Good |
| **Best Practices** | **96/100** | 🟢 Excellent |
| **SEO** | **100/100** | 🟢 Perfect |

### ⚡ **Detailed Performance Metrics**

| Metric | Value | Score |
| --- | --- | --- |
| **First Contentful Paint** | 1.2s | 🟢 Excellent (98/100) |
| **Largest Contentful Paint** | 2.4s | 🟡 Needs Improvement (75/100) |
| **Speed Index** | 4.8s | 🟡 Needs Improvement (67/100) |
| **Total Blocking Time** | 60ms | 🟢 Good (94/100) |
| **Cumulative Layout Shift** | 0 | 🟢 Perfect (100/100) |

### ♿ **Detailed Accessibility Scores (92/100)**

| Audit | Score | Description |
| --- | --- | --- |
| **Label Content Name Mismatch** | 🔴 0/1 | 2 errors with aria-label |
| **Unsized Images** | 🟡 0.5/1 | 1 image without dimensions |
| **Color Contrast** | 🟢 1/1 | Sufficient contrast |
| **Button Names** | 🟢 1/1 | Accessible button names |
| **Link Names** | 🟢 1/1 | Accessible link names |
| **ARIA Roles** | 🟢 1/1 | Correct ARIA roles |
| **HTML Lang** | 🟢 1/1 | Valid lang attribute |
| **Meta Viewport** | 🟢 1/1 | Proper viewport |
| **Image Alt Text** | 🟢 1/1 | Correct alt attributes |
| **List Items** | 🟢 1/1 | Proper list structure |

### 🏆 **Detailed Best Practices Scores (96/100)**

| Audit | Score | Status |
| --- | --- | --- |
| **Uses HTTPS** | 🟢 ✓ | HTTPS is used |
| **HTTP Status Code** | 🟢 1/1 | Correct 200 status |
| **No Console Errors** | 🟢 1/1 | No console errors |
| **Valid Source Maps** | 🟢 1/1 | Valid source maps |
| **No Notification Requests** | 🟢 1/1 | No notification requests |
| **Charset Declaration** | 🟢 1/1 | Correct encoding |
| **No Inspector Issues** | 🟢 1/1 | No DevTools issues |

### 🔍 **Detailed SEO Scores (100/100)**

| Audit | Score | Status |
| --- | --- | --- |
| **Meta Viewport** | 🟢 1/1 | Mobile optimized |
| **Document Title** | 🟢 1/1 | Title present |
| **Meta Description** | 🟢 1/1 | Description present |
| **HTTP Status Code** | 🟢 1/1 | Successful status |
| **Link Text** | 🟢 1/1 | Descriptive link texts |
| **Crawlability** | 🟢 1/1 | Available for indexing |
| **HTML Lang** | 🟢 1/1 | Valid document language |
| **Hreflang** | 🟢 1/1 | Correct hreflang attributes |

### 🔧 **Main Performance Issues**

| Issue | Affects | Potential Savings |
| --- | --- | --- |
| **Improperly sized images** | LCP, FCP | 1,069 KB, 170ms |
| **Inefficient caching** | Overall speed | 1,445 KB |
| **Forced Reflows** | Smoothness | 46.8ms |
| **JavaScript execution time** | TBT | 338ms |

### 📈 **Network Metrics**

| Metric | Value |
| --- | --- |
| **Server Response Time** | 120ms (🟢 Good) |
| **Network RTT** | Minimal |
| **Main Thread Work** | 0.9s |
| **DOM Size** | 453 elements (optimal) |

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

## Troubleshooting

### "Google API key not provided"
Ensure the `GOOGLE_API_KEY` environment variable is set in your Claude Desktop configuration.

### "PageSpeed Insights API error: 403"
Check if PageSpeed Insights API is enabled in your Google Cloud project.

### "Invalid URL"
Ensure the URL includes the protocol (http:// or https://).

## Acknowledgments

Special thanks to [@engmsaleh](https://github.com/engmsaleh) (Mohamed Saleh Zaied) for his significant contribution to the development of this project.

## License

MIT

## Support

For bug reports or feature requests, please create an issue in the repository.