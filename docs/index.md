# Welcome to Switas Web Performance MCP

**Switas Web Performance MCP** is a Model Context Protocol (MCP) server providing tools for the Google PageSpeed Insights, Chrome UX Report (CrUX) and WebPageTest APIs. It enables Large Language Models (LLMs) and AI coding assistants (Claude, Cursor, Codex, Grok, etc.) to analyze web performance, inspect diagnostics, monitor real-user field metrics, and track regressions directly within chat or agent workflows.

## 🚀 Key Features

*   **Ten Tools**: six PageSpeed/CrUX workflow tools from the upstream project plus four WebPageTest tools (real-browser tests, LCP phases, caching and third-party diagnosis, what-if experiments).
*   **Lighthouse Lab Audits**: Run single or multi-run (1–5 iterations with median/spread) audits across Mobile and Desktop device profiles.
*   **Real-User Field Data (CrUX)**: Access 75th percentile Chrome UX Report Core Web Vitals (LCP, CLS, INP) at both URL and origin-wide scopes.
*   **Targeted Diagnostics**: Pinpoint issues through focused lenses: `visual`, `elements`, `network`, `javascript`, `images`, `render-blocking`, and `third-parties`.
*   **Comparisons & Regression Baselines**: Compare two pages side-by-side or record a persistent local baseline to detect regressions.
*   **Smart Recommendations**: Prioritized, actionable advice with estimated savings and clear remediation steps.
*   **Dual Response Formats**: Concise, readable Markdown reports by default, or structured JSON for programmatic consumption.

## 📚 Documentation Overview

*   **[Getting Started](getting-started.md)**: Learn how to install, configure, and connect the server to Claude Desktop, Cursor, and other MCP clients.
*   **[Features](features/index.md)**: Explore the core capabilities, workflows, and diagnostic lenses.
*   **[Tools Reference](features/tools.md)**: Reference for all tools with input parameters, defaults, and examples.
*   **[Concepts](concepts/mcp.md)**: Understand the Model Context Protocol (MCP) and how this server fits into the ecosystem.
*   **[Developers](developers/architecture.md)**: Codebase architecture, data flows, and contribution guidelines.

## 🤝 Open Source

This project is open source and available on [GitHub](https://github.com/switaslabs/web-performance-mcp). It is a fork of [ruslanlap/pagespeed-insights-mcp](https://github.com/ruslanlap/pagespeed-insights-mcp) (Apache-2.0); see NOTICE for what changed. Contributions are welcome!

