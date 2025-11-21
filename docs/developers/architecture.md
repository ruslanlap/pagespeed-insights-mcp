# Architecture Overview

This document provides a high-level overview of the PageSpeed Insights MCP Server codebase. It is intended for developers who wish to contribute to the project or understand its internal workings.

## Project Structure

The project is built with **TypeScript** and runs on **Node.js**. It uses the official `@modelcontextprotocol/sdk` to implement the MCP server.

```
src/
├── index.ts              # Entry point and Server definition
├── pagespeed-client.ts   # Google API interaction layer
├── response-parser.ts    # Data transformation logic
├── recommendations.ts    # Recommendation engine
├── cache.ts              # Caching implementation
├── logger.ts             # Logging utility
├── env.ts                # Environment variable validation
├── schemas.ts            # Zod schemas for input validation
└── types.ts              # TypeScript interfaces
```

## Key Components

### 1. Server Entry Point (`index.ts`)
This is the core of the application. It:
*   Initializes the MCP `Server` instance.
*   Defines the capabilities (tools) exposed to the client.
*   Maps tool execution requests to specific handler functions.
*   Handles the main request/response loop via `StdioServerTransport`.

### 2. PageSpeed Client (`pagespeed-client.ts`)
This class is responsible for communicating with the external Google PageSpeed Insights API.
*   Constructs the API URL with appropriate parameters (strategy, locale, categories).
*   Handles authentication using the `GOOGLE_API_KEY`.
*   Manages network retries and error handling.
*   Integrates with the caching layer to avoid redundant requests.

### 3. Response Parser (`response-parser.ts`)
The raw JSON response from Google is massive and complex. This component:
*   Extracts key metrics (LCP, CLS, TBT, etc.).
*   Simplifies the audit results.
*   Formats the data into cleaner structures for the AI to consume.

### 4. Recommendation Engine (`recommendations.ts`)
This component adds value on top of the raw data. It:
*   Analyzes the audit results.
*   Assigns priority scores to issues based on their impact.
*   Generates human-readable advice and "Next Steps".

### 5. Caching (`cache.ts`)
To improve performance and reduce API quota usage, the server implements an in-memory cache.
*   Keys are generated based on URL, strategy, and locale.
*   Results are cached for a configurable TTL (default 1 hour).

## Data Flow

1.  **Request**: The MCP Client (e.g., Claude) sends a `call_tool` request (e.g., `analyze_page_speed`).
2.  **Validation**: `index.ts` validates the arguments using Zod schemas defined in `schemas.ts`.
3.  **Check Cache**: The `PageSpeedClient` checks if a valid result exists in the cache.
4.  **API Call**: If not cached, `PageSpeedClient` fetches data from Google PageSpeed Insights API.
5.  **Processing**: The raw response is passed to `ResponseParser` or `PerformanceRecommendationsEngine`.
6.  **Response**: The processed data is returned to the MCP Client as a text content block.

## Technologies Used

*   **TypeScript**: For type safety and developer experience.
*   **@modelcontextprotocol/sdk**: The official MCP implementation.
*   **Zod**: For runtime schema validation.
*   **Node-fetch**: For making HTTP requests.
*   **Pino**: For structured logging.
