# Tools Reference (v2)

This reference documents the six workflow-oriented tools in PageSpeed Insights MCP v2. All data tools accept `responseFormat`: `"markdown"` (default) or `"json"`, and return structured MCP content.

---

## 1. `pagespeed_analyze_page`

Run a Lighthouse performance audit for a single public web page.

### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `url` | string | **Yes** | — | Public HTTP/HTTPS URL (e.g., `https://example.com/products`). |
| `strategy` | string | No | `"mobile"` | Device profile: `"mobile"`, `"desktop"`, or `"both"`. |
| `categories` | array | No | `["performance"]` | Categories to audit: `"performance"`, `"accessibility"`, `"best-practices"`, `"seo"`, `"pwa"`. |
| `locale` | string | No | `"en"` | BCP-47 locale tag (e.g., `"en"`, `"uk-UA"`). |
| `runs` | integer | No | `1` | Number of distinct runs (1–5). Returns median metrics and variance spread. |
| `report` | string | No | `"summary"` | Detail shape: `"summary"`, `"full"`, `"recommendations"`, `"audit"`, `"performance-map"`. |
| `responseFormat` | string | No | `"markdown"` | Output format: `"markdown"` or `"json"`. |

### Example

```json
{
  "url": "https://example.com",
  "strategy": "mobile",
  "runs": 3,
  "report": "recommendations"
}
```

---

## 2. `pagespeed_diagnose_page`

Investigate one specific performance bottleneck using focused diagnostics instead of dumping full audit trees.

### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `url` | string | **Yes** | — | Target page URL. |
| `focus` | string | **Yes** | — | Diagnostic lens: `"visual"`, `"elements"`, `"network"`, `"javascript"`, `"images"`, `"render-blocking"`, or `"third-parties"`. |
| `strategy` | string | No | `"mobile"` | Device profile: `"mobile"`, `"desktop"`, or `"both"`. |
| `responseFormat` | string | No | `"markdown"` | Output format: `"markdown"` or `"json"`. |

### Example

```json
{
  "url": "https://example.com/checkout",
  "focus": "render-blocking",
  "strategy": "mobile"
}
```

---

## 3. `pagespeed_get_field_data`

Retrieve real-user Core Web Vitals (p75) from the Chrome User Experience Report (CrUX).

### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `url` | string | **Yes** | — | Target URL or origin. |
| `scope` | string | No | `"page"` | Query scope: `"page"` (specific URL) or `"origin"` (entire domain). |
| `formFactor` | string | No | `"PHONE"` | Device segment: `"PHONE"`, `"DESKTOP"`, `"TABLET"`, or `"ALL"` (`ALL` only for `scope="origin"`). |
| `responseFormat` | string | No | `"markdown"` | Output format: `"markdown"` or `"json"`. |

### Example

```json
{
  "url": "https://example.com",
  "scope": "origin",
  "formFactor": "ALL"
}
```

---

## 4. `pagespeed_compare_pages`

Compare two pages side-by-side or evaluate a URL against a locally stored performance baseline to detect regressions.

### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `mode` | string | **Yes** | — | Comparison mode: `"pages"` or `"baseline"`. |
| `url` | string | **Yes** | — | Primary URL. |
| `against` | string | *Yes (pages mode)* | — | Second URL to compare against (required when `mode="pages"`). |
| `strategy` | string | No | `"mobile"` | Device profile: `"mobile"` or `"desktop"`. |
| `categories` | array | No | `["performance"]` | Lighthouse categories to include. |
| `runs` | integer | No | `1` | Iterations per URL (1–5). Recommended: `3` for baseline mode. |
| `replaceBaseline` | boolean | No | `false` | Baseline mode only: overwrite existing stored baseline. |
| `responseFormat` | string | No | `"markdown"` | Output format: `"markdown"` or `"json"`. |

### Example (Side-by-Side)

```json
{
  "mode": "pages",
  "url": "https://staging.example.com",
  "against": "https://example.com"
}
```

### Example (Baseline Tracking)

```json
{
  "mode": "baseline",
  "url": "https://example.com",
  "runs": 3
}
```

---

## 5. `pagespeed_analyze_batch`

Analyze multiple URLs (1–10) in a single batch with progress notifications.

### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `urls` | array[string] | **Yes** | — | List of 1 to 10 public HTTP/HTTPS URLs. |
| `strategy` | string | No | `"mobile"` | Device profile: `"mobile"`, `"desktop"`, or `"both"`. |
| `categories` | array | No | `["performance"]` | Lighthouse categories to include. |
| `locale` | string | No | `"en"` | BCP-47 locale tag. |
| `report` | string | No | `"summary"` | Detail level per URL: `"summary"` or `"full"`. |
| `responseFormat` | string | No | `"markdown"` | Output format: `"markdown"` or `"json"`. |

### Example

```json
{
  "urls": [
    "https://example.com/",
    "https://example.com/pricing",
    "https://example.com/features"
  ],
  "report": "summary"
}
```

---

## 6. `pagespeed_clear_cache`

Clears the in-memory PageSpeed API response cache of the running MCP server process.

- **Parameters**: None.
- **Side effects**: Safe and idempotent. Forces subsequent analysis queries to fetch fresh data from Google.

---

## Migration from v1 to v2

In v2, the 19 endpoint-shaped v1 tools were consolidated into 6 workflow tools:

| v1 Legacy Tool(s) | v2 Replacement |
| :--- | :--- |
| `analyze_page_speed`, `get_performance_score`, `get_recommendations`, `run_custom_audit`, `get_performance_map` | `pagespeed_analyze_page` (use `report` parameter) |
| `get_screenshots`, `get_element_diagnostics`, `get_network_diagnostics`, `get_javascript_execution`, `get_image_optimization`, `get_render_blocking_resources`, `get_third_party_summary` | `pagespeed_diagnose_page` (use `focus` parameter) |
| `get_crux_summary`, `get_origin_crux` | `pagespeed_get_field_data` (use `scope="page"` or `scope="origin"`) |
| `compare_pages`, `manage_baselines` | `pagespeed_compare_pages` (use `mode="pages"` or `mode="baseline"`) |
| `batch_analyze` | `pagespeed_analyze_batch` |
| `clear_cache` | `pagespeed_clear_cache` |
| `full_report` | Split into explicit lab (`pagespeed_analyze_page`) and field (`pagespeed_get_field_data`) calls |

