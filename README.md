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