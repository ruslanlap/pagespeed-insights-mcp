import { z } from "zod";

export const UrlSchema = z
  .string()
  .url("Must be a valid URL")
  .refine(
    (value) => {
      try {
        const { protocol } = new URL(value);
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL must use http:// or https:// scheme" }
  );

export const StrategySchema = z.enum(["mobile", "desktop", "both"]).default("mobile");

export const CategorySchema = z.enum([
  "performance",
  "accessibility",
  "best-practices",
  "seo",
  "pwa",
]);

export const LocaleSchema = z
  .string()
  .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Invalid locale format")
  .default("en");

export const AnalyzePageSpeedSchema = z.object({
  url: UrlSchema,
  strategy: StrategySchema,
  category: z.array(CategorySchema).optional().default(["performance"]),
  locale: LocaleSchema,
  runs: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .describe(
      "Distinct analyses to run (default 1). >1 reports median with min-max spread; " +
      "cached replays (same fetchTime) are dropped and counted"
    ),
});

export const PerformanceSummarySchema = z.object({
  url: UrlSchema,
  strategy: StrategySchema,
});

export const CruxSummarySchema = z.object({
  url: UrlSchema,
  formFactor: z.enum(["PHONE", "DESKTOP", "TABLET"]).optional(),
});

export const OriginCruxSchema = z.object({
  origin: UrlSchema,
  formFactor: z.enum(["PHONE", "DESKTOP", "TABLET", "ALL"]).optional(),
});

export const CompareUrlsSchema = z.object({
  urlA: UrlSchema,
  urlB: UrlSchema,
  strategy: StrategySchema,
  categories: z.array(CategorySchema).optional().default(["performance"]),
});

export const BatchAnalyzeSchema = z.object({
  urls: z.array(UrlSchema).min(1).max(10),
  strategy: StrategySchema,
  category: z.array(CategorySchema).optional().default(["performance"]),
  locale: LocaleSchema,
});

/** Public v2 tool contracts. Shared vocabulary makes the six tools predictable. */
export const AnalysisReportSchema = AnalyzePageSpeedSchema.extend({
  report: z.enum(["summary", "full", "recommendations", "audit", "performance-map"])
    .default("summary")
    .describe("Result detail: summary (default), full Lighthouse report, prioritized recommendations, non-performance audit findings, or a Mermaid performance map."),
}).strict();

export const DiagnoseSchema = z.object({
  url: UrlSchema.describe("Public http(s) page URL, for example https://example.com/products."),
  strategy: StrategySchema.describe("Lighthouse device profile. Use mobile unless investigating a desktop-only issue."),
  focus: z.enum(["visual", "elements", "network", "javascript", "images", "render-blocking", "third-parties"])
    .describe("Diagnostic lens: network for request timing, elements for LCP/CLS DOM causes, or visual for screenshots and filmstrip."),
}).strict();

export const FieldDataSchema = z.object({
  url: UrlSchema.describe("Page URL for scope=page, or a bare origin such as https://example.com for scope=origin."),
  scope: z.enum(["page", "origin"]).default("page").describe("Page-level field data (default) or data aggregated across an origin."),
  formFactor: z.enum(["PHONE", "DESKTOP", "TABLET", "ALL"]).default("PHONE").describe("Chrome UX Report device segment. ALL is available only for origin queries."),
}).strict().superRefine((input, ctx) => {
  if (input.scope === "page" && input.formFactor === "ALL") {
    ctx.addIssue({ code: "custom", path: ["formFactor"], message: "Use PHONE, DESKTOP, or TABLET for scope=page; ALL is valid only for scope=origin." });
  }
  if (input.scope === "origin") {
    const parsed = new URL(input.url);
    if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
      ctx.addIssue({ code: "custom", path: ["url"], message: "scope=origin requires a bare origin such as https://example.com (no path, query, or fragment)." });
    }
  }
});

export const CompareSchema = z.object({
  mode: z.enum(["pages", "baseline"]).describe("pages compares two URLs now; baseline records or compares one URL against its stored measurement."),
  url: UrlSchema.describe("Primary page URL."),
  against: UrlSchema.optional().describe("Second page URL; required when mode=pages."),
  strategy: z.enum(["mobile", "desktop"]).default("mobile").describe("Lighthouse device profile; it is part of a baseline identity."),
  categories: z.array(CategorySchema).min(1).default(["performance"]).describe("Categories to compare in pages mode."),
  runs: z.number().int().min(1).max(5).default(1).describe("Distinct measurements. Use 3–5 for baseline comparisons to reduce Lighthouse variability."),
  replaceBaseline: z.boolean().default(false).describe("In baseline mode, replace the stored starting measurement. This overwrites local baseline state."),
}).strict().superRefine((input, ctx) => {
  if (input.mode === "pages" && !input.against) ctx.addIssue({ code: "custom", path: ["against"], message: "against is required when mode=pages." });
  if (input.mode === "baseline" && input.runs < 2) ctx.addIssue({ code: "custom", path: ["runs"], message: "baseline comparison requires runs >= 2; use 3 for a more reliable verdict." });
});

export const BatchAnalysisSchema = BatchAnalyzeSchema.extend({
  report: z.enum(["summary", "full"]).default("summary").describe("Per-URL result detail. summary is concise; full includes Lighthouse audit detail."),
}).strict();

export type AnalyzePageSpeedInput = z.infer<typeof AnalyzePageSpeedSchema>;
export type PerformanceSummaryInput = z.infer<typeof PerformanceSummarySchema>;
export type CruxSummaryInput = z.infer<typeof CruxSummarySchema>;
export type OriginCruxInput = z.infer<typeof OriginCruxSchema>;
export type CompareUrlsInput = z.infer<typeof CompareUrlsSchema>;
export type BatchAnalyzeInput = z.infer<typeof BatchAnalyzeSchema>;
export type AnalysisReportInput = z.infer<typeof AnalysisReportSchema>;
export type DiagnoseInput = z.infer<typeof DiagnoseSchema>;
export type FieldDataInput = z.infer<typeof FieldDataSchema>;
export type CompareInput = z.infer<typeof CompareSchema>;
export type BatchAnalysisInput = z.infer<typeof BatchAnalysisSchema>;
