import { z } from "zod";

const EnvSchema = z.object({
  GOOGLE_API_KEY: z.string().min(1, "Google API key is required"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  MAX_CONCURRENCY: z.coerce.number().min(1).max(10).default(3),
  REQUEST_TIMEOUT: z.coerce.number().min(1000).max(60000).default(30000),
  RETRY_ATTEMPTS: z.coerce.number().min(0).max(5).default(3),
  CACHE_TTL: z.coerce.number().min(60).max(86400).default(3600),
  REDIS_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Environment = z.infer<typeof EnvSchema>;

let cachedEnv: Environment | null = null;

export function getEnv(): Environment {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = EnvSchema.safeParse(process.env);
  
  if (!result.success) {
    const errors = result.error.issues
      .map(issue => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    
    throw new Error(`Environment validation failed:\n${errors}`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}

export function validateEnv(): void {
  getEnv();
}