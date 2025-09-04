import pino from "pino";
import { getEnv } from "./env.js";

let logger: pino.Logger;

function createLogger(): pino.Logger {
  const env = getEnv();
  
  return pino({
    level: env.LOG_LEVEL,
    transport: env.NODE_ENV === "development" ? {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "yyyy-mm-dd HH:MM:ss",
        ignore: "pid,hostname",
      },
    } : undefined,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

export function getLogger(): pino.Logger {
  if (!logger) {
    logger = createLogger();
  }
  return logger;
}

export function createRequestLogger(correlationId: string, toolName?: string) {
  const baseLogger = getLogger();
  return baseLogger.child({
    correlationId,
    ...(toolName && { toolName }),
  });
}