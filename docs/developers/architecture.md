# Architecture Overview

This document provides a high-level overview of the PageSpeed Insights MCP Server codebase. It is intended for developers who wish to contribute to the project or understand its internal workings.

## Project Structure

The project is built with **TypeScript** and runs on **Node.js** (>=20.19.0). It uses the official `@modelcontextprotocol/sdk` to implement the MCP server.

```
src/
├── index.ts              # Entry point, MCP server dispatch, and tool handlers
├── tool-definitions.ts   # v2 tool specifications, descriptions, and JSON schemas
├── pagespeed-client.ts   # Google API interaction layer with retry & concurrency limits
├── response-parser.ts    # Data transformation and diagnostic report formatting
├── recommendations.ts    # Actionable recommendation engine with impact scoring
├── baselines.ts          # Local baseline storage and regression calculation
├── multirun.ts           # Multi-run median selection and variance spread calculation
├── cache.ts              # In-memory caching with TTL
├── logger.ts             # Pino logger setup with redaction
├── env.ts                # Environment variable schema validation via Zod
├── schemas.ts            # Zod input schemas for runtime validation
├── types.ts              # TypeScript interfaces and shared types
└── tests/                # Vitest test suites
```

## Key Components

### 1. Server Entry Point (`index.ts`) & Tool Definitions (`tool-definitions.ts`)
*   Defines the 6 workflow-oriented v2 MCP tools: `pagespeed_analyze_page`, `pagespeed_diagnose_page`, `pagespeed_get_field_data`, `pagespeed_compare_pages`, `pagespeed_analyze_batch`, and `pagespeed_clear_cache`.
*   Registers tools and handlers with `@modelcontextprotocol/sdk`.
*   Validates parameters against Zod schemas in `schemas.ts`.
*   Handles transport via `StdioServerTransport`.

### 2. PageSpeed Client (`pagespeed-client.ts`)
Responsible for communicating with Google PageSpeed Insights and Chrome UX Report APIs:
*   Constructs API queries with proper parameters (strategy, locale, categories).
*   Manages concurrency with `p-limit` and resilient retries with exponential backoff using `p-retry`.
*   Supports request cancellation using `AbortController` and `AsyncLocalStorage`.
*   Integrates with the in-memory caching layer.

### 3. Response Parser (`response-parser.ts`)
Converts raw Lighthouse audit outputs into clean markdown summaries, Mermaid performance maps, or structured JSON:
*   Extracts Core Web Vitals (LCP, CLS, INP, FCP, TTFB).
*   Filters targeted diagnostic lenses (`visual`, `elements`, `network`, `javascript`, `images`, `render-blocking`, `third-parties`).

### 4. Recommendation Engine (`recommendations.ts`)
*   Analyzes audit opportunities and diagnostics.
*   Assigns priority rankings based on estimated byte and latency savings.
*   Provides clear, actionable next steps for remediation.

### 5. Baselines & Multi-Run Stability (`baselines.ts`, `multirun.ts`)
*   `multirun.ts`: Executes 1–5 runs, detects outliers, and selects the median run based on metric distributions.
*   `baselines.ts`: Persists baseline performance metrics locally and computes regression or improvement deltas.

### 6. Caching (`cache.ts`)
In-memory cache keyed by request parameters with configurable TTL (default: 1 hour) to minimize Google API quota usage and improve responsiveness.

## Data Flow

1.  **Request**: MCP Client sends a `call_tool` request (e.g., `pagespeed_analyze_page`).
2.  **Validation**: `index.ts` validates arguments against Zod schemas in `schemas.ts`.
3.  **Check Cache**: `PageSpeedClient` checks if valid cached results exist.
4.  **API Call**: If uncached, `PageSpeedClient` fetches data from Google PageSpeed Insights API using native `fetch` with `p-limit` and `p-retry`.
5.  **Processing**: The raw response is processed by `ResponseParser` or `PerformanceRecommendationsEngine`.
6.  **Response**: The processed report is returned to the client as Markdown or structured JSON.

## Technologies Used

*   **TypeScript**: Static type safety and developer productivity.
*   **@modelcontextprotocol/sdk**: The official Model Context Protocol implementation.
*   **Zod**: Runtime schema definition and validation.
*   **Pino & Pino-pretty**: High-performance structured logging.
*   **Vitest**: Fast unit and integration testing.

