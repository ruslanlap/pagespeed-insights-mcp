# PageSpeed Insights MCP Server

[![npm version](https://badge.fury.io/js/pagespeed-insights-mcp.svg)](https://www.npmjs.com/package/pagespeed-insights-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MCP server for Google PageSpeed Insights API that enables web page performance analysis directly through Claude.

## ✨ Features

- 🚀 **Performance Analysis** of web pages using Google PageSpeed Insights
- 📱 **Multi-platform Support**: mobile and desktop devices
- 🔍 **Detailed Lighthouse Reports** with comprehensive metrics
- 📊 **Simplified Reports** with key performance indicators
- 🌍 **Localization** - support for multiple languages
- ⚡ **Quick Installation** - one command setup
- 🐳 **Docker Support** for containerized deployment

## 🚀 Quick Installation

### Option 1: Automatic Installation (Recommended)

```bash
curl -sSL https://raw.githubusercontent.com/ruslanlap/pagespeed-insights-mcp/main/install.sh | bash
```

### Option 2: Via npm

```bash
# Global installation
npm install -g pagespeed-insights-mcp

# Or use without installation
npx pagespeed-insights-mcp
```

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

#### For npm installation:
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

#### For global installation:
```json
{
  "mcpServers": {
    "pagespeed-insights": {
      "command": "pagespeed-insights-mcp",
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

## License

MIT

## Support

For bug reports or feature requests, please create an issue in the repository.