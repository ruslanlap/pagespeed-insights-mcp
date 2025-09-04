import { z } from "zod";

export const UrlSchema = z.string().url("Must be a valid URL");

export const StrategySchema = z.enum(["mobile", "desktop"]).default("mobile");

export const CategorySchema = z.enum([
  "performance",
  "accessibility", 
  "best-practices",
  "seo",
  "pwa"
]);

export const LocaleSchema = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Invalid locale format").default("en");

export const AnalyzePageSpeedSchema = z.object({
  url: UrlSchema,
  strategy: StrategySchema,
  category: z.array(CategorySchema).optional().default(["performance"]),
  locale: LocaleSchema,
});

export const PerformanceSummarySchema = z.object({
  url: UrlSchema,
  strategy: StrategySchema,
});

export const CruxSummarySchema = z.object({
  url: UrlSchema,
  formFactor: z.enum(["PHONE", "DESKTOP", "TABLET"]).optional(),
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

export type AnalyzePageSpeedInput = z.infer<typeof AnalyzePageSpeedSchema>;
export type PerformanceSummaryInput = z.infer<typeof PerformanceSummarySchema>;
export type CruxSummaryInput = z.infer<typeof CruxSummarySchema>;
export type CompareUrlsInput = z.infer<typeof CompareUrlsSchema>;
export type BatchAnalyzeInput = z.infer<typeof BatchAnalyzeSchema>;