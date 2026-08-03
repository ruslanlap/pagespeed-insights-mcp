import { getLogger } from "./logger.js";

const logger = getLogger();

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      expiresAt: now + ttl,
    });
    
    logger.debug({ key, ttl }, "Cache entry stored");
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      logger.debug({ key }, "Cache miss");
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      logger.debug({ key }, "Cache entry expired");
      return null;
    }
    
    logger.debug({ key }, "Cache hit");
    return entry.data as T;
  }


  clear(): void {
    this.cache.clear();
    logger.debug("Cache cleared");
  }

  size(): number {
    return this.cache.size;
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      logger.debug({ removed }, "Cleaned up expired cache entries");
    }
  }
}

// Create cache key for PageSpeed Insights
export function createPSICacheKey(url: string, strategy: string, categories: string[], locale: string): string {
  return `psi:${url}:${strategy}:${categories.sort().join(',')}:${locale}`;
}

// Create cache key for CrUX data  
export function createCruxCacheKey(url: string, formFactor?: string): string {
  return `crux:${url}:${formFactor || 'default'}`;
}

// Singleton cache instance
export const cache = new SimpleCache();

// Cleanup interval (every 10 minutes)
setInterval(() => {
  cache.cleanup();
}, 10 * 60 * 1000);