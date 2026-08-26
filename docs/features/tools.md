# Tools Reference (v2)

This is the v2 breaking API. The 19 v1 tool names were removed in favor of six workflow-oriented tools. All data tools accept `responseFormat`: `markdown` (default) or `json`, and return structured MCP content.

## `pagespeed_analyze_page`

Run one Lighthouse analysis. Required: `url`. Optional: `strategy` (`mobile`, `desktop`, `both`), `categories`, `locale`, `runs` (1–5), and `report` (`summary`, `full`, `recommendations`, `audit`, `performance-map`). Use `summary` first; use a specific report only when needed.

## `pagespeed_diagnose_page`

Investigate one diagnosed issue. Required: `url`, `focus`. The focus is one of `visual`, `elements`, `network`, `javascript`, `images`, `render-blocking`, or `third-parties`. This returns focused evidence instead of a full audit dump.

## `pagespeed_get_field_data`

Retrieve Chrome UX Report p75 real-user metrics. Required: `url`. Use `scope=page` for one URL and `scope=origin` for a bare origin; the latter is useful where page data is unavailable. `ALL` form factor is valid only for origins.

## `pagespeed_compare_pages`

Use `mode=pages` with `url` and `against` for a current side-by-side comparison. Use `mode=baseline` with one `url` and at least two `runs` to record or evaluate a stored local baseline. `replaceBaseline=true` overwrites that local state.

## `pagespeed_analyze_batch`

Analyze 1–10 URLs. Optional `report=summary|full` controls per-page detail. Use the single-page tool when only one result is needed.

## `pagespeed_clear_cache`

Clear only the current server process's in-memory PageSpeed cache. It is idempotent and does not alter websites or remote data.

## Migration

`analyze_page_speed`, summary/recommendation/audit/map tools consolidate into `pagespeed_analyze_page`; diagnostics consolidate into `pagespeed_diagnose_page`; CrUX tools consolidate into `pagespeed_get_field_data`; page/baseline comparison consolidate into `pagespeed_compare_pages`; batch/cache names gain the `pagespeed_` prefix. `full_report` is deliberately split into explicit lab and field calls.
