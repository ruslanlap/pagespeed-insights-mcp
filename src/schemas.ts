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
    { message: "URL must use http:// or https:// scheme" },
  );

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

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
});

export const NetworkAnalysisSchema = z.object({
  url: UrlSchema,
  strategy: StrategySchema,
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
});

export const JavaScriptAnalysisSchema = z.object({
  url: UrlSchema,
  strategy: StrategySchema,
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
});

export const FullAuditSchema = z.object({
  url: UrlSchema,
  strategy: StrategySchema,
  categories: z.array(CategorySchema).optional().default(["performance", "accessibility", "best-practices", "seo"]),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
});

export type AnalyzePageSpeedInput = z.infer<typeof AnalyzePageSpeedSchema>;
export type PerformanceSummaryInput = z.infer<typeof PerformanceSummarySchema>;
export type CruxSummaryInput = z.infer<typeof CruxSummarySchema>;
export type CompareUrlsInput = z.infer<typeof CompareUrlsSchema>;
export type BatchAnalyzeInput = z.infer<typeof BatchAnalyzeSchema>;
export type NetworkAnalysisInput = z.infer<typeof NetworkAnalysisSchema>;
export type JavaScriptAnalysisInput = z.infer<typeof JavaScriptAnalysisSchema>;
export type FullAuditInput = z.infer<typeof FullAuditSchema>;