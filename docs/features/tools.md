# Tools Reference

This section details all the tools available in the PageSpeed Insights MCP server. These tools can be called by your MCP client (e.g., Claude).

## Core Analysis Tools

### `analyze_page_speed`
Runs a comprehensive Google PageSpeed Insights analysis with Lighthouse metrics.

**Parameters:**
*   `url` (string, required): The URL to analyze.
*   `strategy` (string): "mobile" or "desktop" (default: "mobile").
*   `category` (array): Categories to analyze (e.g., `["performance", "seo"]`).
*   `locale` (string): Locale for results (default: "en").

### `get_performance_summary`
Retrieves a simplified report focusing on key performance metrics and opportunities.

**Parameters:**
*   `url` (string, required): The URL to analyze.
*   `strategy` (string): "mobile" or "desktop".

### `full_report`
Generates a unified report combining Lighthouse lab data with CrUX field data.

**Parameters:**
*   `url` (string, required): The URL to analyze.
*   `strategy` (string): "mobile" or "desktop".
*   `category` (array): Categories to include.

### `get_full_audit`
Runs a complete audit covering all categories: Performance, Accessibility, Best Practices, SEO, and PWA.

**Parameters:**
*   `url` (string, required): The URL to analyze.
*   `strategy` (string): "mobile" or "desktop".

## Diagnostic Tools

### `get_visual_analysis`
Retrieves visual data about the page load.

**Returns:**
*   Final screenshot.
*   Filmstrip of frames during load.
*   Full-page screenshot.

### `get_element_analysis`
Identifies specific DOM elements causing performance issues.

**Returns:**
*   LCP (Largest Contentful Paint) element.
*   CLS (Cumulative Layout Shift) contributors.
*   Lazy-loading issues.

### `get_network_analysis`
Provides a detailed waterfall of network requests.

**Returns:**
*   Request timing and priority.
*   Resource size breakdown.
*   Server latency metrics.

### `get_javascript_analysis`
Analyzes JavaScript execution and impact.

**Returns:**
*   Bootup time.
*   Main thread work breakdown.
*   Unused code detection.

### `get_image_optimization_details`
Identifies image-related performance opportunities.

**Returns:**
*   Improperly sized images.
*   Offscreen images.
*   Format optimization suggestions (WebP/AVIF).

### `get_render_blocking_details`
Identifies resources that block the first paint of your page.

**Returns:**
*   Blocking CSS/JS files.
*   Critical request chains.

### `get_third_party_impact`
Analyzes the impact of third-party scripts (ads, analytics, etc.).

**Returns:**
*   Impact grouped by entity (e.g., Google, Facebook).
*   Blocking time per provider.

## Comparison & Batch Tools

### `compare_pages`
Compares performance metrics between two URLs side-by-side.

**Parameters:**
*   `urlA` (string, required): First URL.
*   `urlB` (string, required): Second URL.
*   `strategy` (string): Analysis strategy.

### `batch_analyze`
Analyzes multiple URLs in sequence.

**Parameters:**
*   `urls` (array of strings, required): List of URLs (max 10).
*   `strategy` (string): Analysis strategy.

## Utility Tools

### `get_recommendations`
Generates prioritized, actionable recommendations based on analysis results.

### `crux_summary`
Retrieves Chrome User Experience Report (CrUX) data.

**Parameters:**
*   `url` (string, required): The URL to analyze.
*   `formFactor` (string): "PHONE", "DESKTOP", or "TABLET".

### `clear_cache`
Clears the internal cache to force fresh API requests for subsequent calls.
