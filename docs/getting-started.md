# Getting Started

This guide will help you set up the PageSpeed Insights MCP server and connect it to your MCP client (Claude Desktop, Cursor, Codex, Grok, etc.).

## Prerequisites

Before you begin, ensure you have the following:

1.  **Node.js**: Version 20.19.0 or higher (`node -v`).
2.  **Google API Key**: Required to access the PageSpeed Insights API.

### Obtaining a Google API Key

To use the PageSpeed Insights MCP server, you need a Google API key with the PageSpeed Insights API enabled.

!!! tip "⚡ Quick Setup Link"
    You can go directly to the **[Google Cloud Credentials Setup Page](https://console.cloud.google.com/apis/credentials/key/)** to quickly create or manage API keys in your project.

#### Step-by-Step Guide

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/) (or use the [Quick Setup Link](https://console.cloud.google.com/apis/credentials/key/)).
2.  Create a new project or select an existing one.
3.  Navigate to **APIs & Services** > **Library**.
4.  Search for **"PageSpeed Insights API"** and click **Enable**.
5.  Go to **APIs & Services** > **Credentials**.
6.  Click **Create Credentials** > **API Key**.
7.  Copy the generated key.

![Google Cloud Console API Key Setup](assets/3.png)

## Installation & Running

You can run the server using `npx` (recommended), install it globally via `npm`, or use Docker.

### Option 1: Using `npx` (Recommended)

You can run the server directly without manual installation:

```bash
export GOOGLE_API_KEY=your-google-api-key
npx -y -p pino-pretty -p pagespeed-insights-mcp pagespeed-insights-mcp
```

### Option 2: Global Installation

Install the package globally using npm:

```bash
npm install -g pagespeed-insights-mcp
```

Then run it:

```bash
export GOOGLE_API_KEY=your-google-api-key
pagespeed-insights-mcp
```

### Option 3: Docker

Build and run the container:

```bash
docker build -t pagespeed-insights-mcp .
docker run -e GOOGLE_API_KEY=your-key pagespeed-insights-mcp
```

## Configuration

The server is configured via environment variables.

| Variable | Description | Required | Default | Valid Values |
| :--- | :--- | :--- | :--- | :--- |
| `GOOGLE_API_KEY` | Your Google PageSpeed Insights API Key | **Yes** | — | Non-empty string |
| `LOG_LEVEL` | Logging level | No | `info` | `trace`, `debug`, `info`, `warn`, `error`, `fatal` |
| `MAX_CONCURRENCY` | Maximum concurrent requests | No | `3` | `1` – `10` |
| `REQUEST_TIMEOUT` | HTTP request timeout in milliseconds | No | `30000` | `1000` – `60000` |
| `RETRY_ATTEMPTS` | Network failure retry attempts | No | `3` | `0` – `5` |
| `CACHE_TTL` | Cache time-to-live in seconds | No | `3600` | `60` – `86400` |
| `NODE_ENV` | Runtime environment | No | `development` | `development`, `production`, `test` |

## Connecting to MCP Clients

### Claude Desktop

Edit your `claude_desktop_config.json`:

*   **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
*   **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
*   **Linux**: `~/.config/claude/claude_desktop_config.json`

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
        "pagespeed-insights-mcp",
        "pagespeed-insights-mcp"
      ],
      "env": {
        "GOOGLE_API_KEY": "your-google-api-key-here"
      }
    }
  }
}
```

### Codex / OpenAI / Cursor

Add to your MCP configuration (TOML):

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

### Grok Build (`config.toml`)

Add to `~/.grok/config.toml` (global) or `<repo>/.grok/config.toml` (project-scoped):

```toml
[mcp_servers.pagespeed-insights]
command = "npx"
args = ["-y", "-p", "pino-pretty", "-p", "pagespeed-insights-mcp", "pagespeed-insights-mcp"]
env = { GOOGLE_API_KEY = "${GOOGLE_API_KEY}" }
enabled = true
```

After updating the configuration, restart your client. The PageSpeed Insights tools will now be available in your sessions.

## Usage Examples

Once connected, your AI client has access to the six v2 tools:

*   **Audit a site:**  
    `"Analyze https://example.com and show the top recommendations for mobile."`  
    *(Calls `pagespeed_analyze_page`)*
*   **Diagnose render blockers:**  
    `"What CSS or JS files are blocking rendering on https://example.com?"`  
    *(Calls `pagespeed_diagnose_page` with `focus="render-blocking"`)*
*   **Check real-user Core Web Vitals:**  
    `"Check real-user CrUX field data for https://example.com across mobile devices."`  
    *(Calls `pagespeed_get_field_data`)*
*   **Compare environments:**  
    `"Compare performance between https://staging.example.com and https://example.com."`  
    *(Calls `pagespeed_compare_pages` with `mode="pages"`)*
*   **Track regression against baseline:**  
    `"Record a baseline for https://example.com with 3 runs, then verify if our new changes caused a regression."`  
    *(Calls `pagespeed_compare_pages` with `mode="baseline"`)*

