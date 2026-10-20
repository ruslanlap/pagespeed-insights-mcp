# Welcome to PageSpeed Insights MCP

**PageSpeed Insights MCP** is a Model Context Protocol (MCP) server providing six workflow-oriented tools for the Google PageSpeed Insights and Chrome UX Report (CrUX) APIs. It enables Large Language Models (LLMs) and AI coding assistants (Claude, Cursor, Codex, Grok, etc.) to analyze web performance, inspect diagnostics, monitor real-user field metrics, and track regressions directly within chat or agent workflows.

## 🚀 Key Features

*   **Six Workflow Tools**: Purpose-built tools covering the complete performance engineering cycle instead of 19 disparate endpoint wrappers.
*   **Lighthouse Lab Audits**: Run single or multi-run (1–5 iterations with median/spread) audits across Mobile and Desktop device profiles.
*   **Real-User Field Data (CrUX)**: Access 75th percentile Chrome UX Report Core Web Vitals (LCP, CLS, INP) at both URL and origin-wide scopes.
*   **Targeted Diagnostics**: Pinpoint issues through focused lenses: `visual`, `elements`, `network`, `javascript`, `images`, `render-blocking`, and `third-parties`.
*   **Comparisons & Regression Baselines**: Compare two pages side-by-side or record a persistent local baseline to detect regressions.
*   **Smart Recommendations**: Prioritized, actionable advice with estimated savings and clear remediation steps.
*   **Dual Response Formats**: Concise, readable Markdown reports by default, or structured JSON for programmatic consumption.

## 📚 Documentation Overview

*   **[Getting Started](getting-started.md)**: Learn how to install, configure, and connect the server to Claude Desktop, Cursor, and other MCP clients.
*   **[Features](features/index.md)**: Explore the core capabilities, workflows, and diagnostic lenses.
*   **[Tools Reference](features/tools.md)**: Comprehensive reference for all six v2 tools with input parameters, defaults, and examples.
*   **[Concepts](concepts/mcp.md)**: Understand the Model Context Protocol (MCP) and how this server fits into the ecosystem.
*   **[Developers](developers/architecture.md)**: Codebase architecture, data flows, and contribution guidelines.

## 🤝 Open Source

This project is open source and available on [GitHub](https://github.com/ruslanlap/pagespeed-insights-mcp). Contributions are welcome!

