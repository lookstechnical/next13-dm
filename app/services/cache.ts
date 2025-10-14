/**
 * Advanced cache layer for Supabase services
 * Provides in-memory and localStorage caching with TTL, invalidation, and query-based caching
 */

export interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache entries
  storage?: 'memory' | 'localStorage' | 'both';
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

export interface CacheInvalidationPattern {
  table: string;
  keys?: string[];
  patterns?: RegExp[];
}

class CacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private defaultConfig: Required<CacheConfig> = {
    ttl: 5 * 60 * 1000, // 5 minutes default
    maxSize: 1000,
    storage: 'both'
  };

  /**
   * Check if we're in a browser environment with localStorage
   */
  private get isLocalStorageAvailable(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  /**
   * Generate a cache key from query parameters
   */
  generateKey(table: string, method: string, params?: Record<string, any>): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${table}:${method}:${paramStr}`;
  }

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isValid(memoryEntry)) {
      return memoryEntry.data;
    }

    // Check localStorage if enabled and available
    if (this.isLocalStorageAvailable && (this.defaultConfig.storage === 'both' || this.defaultConfig.storage === 'localStorage')) {
      try {
        const stored = localStorage.getItem(`cache:${key}`);
        if (stored) {
          const entry: CacheEntry<T> = JSON.parse(stored);
          if (this.isValid(entry)) {
            // Restore to memory cache for faster access
            this.memoryCache.set(key, entry);
            return entry.data;
          } else {
            localStorage.removeItem(`cache:${key}`);
          }
        }
      } catch (error) {
        console.warn('Cache localStorage read error:', error);
      }
    }

    return null;
  }

  /**
   * Set cached data
   */
  async set<T>(key: string, data: T, config: CacheConfig = {}): Promise<void> {
    const ttl = config.ttl ?? this.defaultConfig.ttl;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key
    };

    // Store in memory
    this.memoryCache.set(key, entry);

    // Store in localStorage if enabled and available
    if (this.isLocalStorageAvailable && (this.defaultConfig.storage === 'both' || this.defaultConfig.storage === 'localStorage')) {
      try {
        localStorage.setItem(`cache:${key}`, JSON.stringify(entry));
      } catch (error) {
        console.warn('Cache localStorage write error:', error);
      }
    }

    // Cleanup old entries if cache is too large
    if (this.memoryCache.size > this.defaultConfig.maxSize) {
      this.cleanup();
    }
  }

  /**
   * Check if cache entry is valid
   */
  private isValid(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => {
      this.memoryCache.delete(key);
      if (this.isLocalStorageAvailable && (this.defaultConfig.storage === 'both' || this.defaultConfig.storage === 'localStorage')) {
        try {
          localStorage.removeItem(`cache:${key}`);
        } catch (error) {
          console.warn('Cache cleanup error:', error);
        }
      }
    });
  }

  /**
   * Invalidate cache entries by patterns
   */
  invalidate(patterns: CacheInvalidationPattern[]): void {
    patterns.forEach(pattern => {
      const keysToDelete: string[] = [];

      // Check memory cache
      for (const [key] of this.memoryCache) {
        if (this.shouldInvalidate(key, pattern)) {
          keysToDelete.push(key);
        }
      }

      // Check localStorage if available
      if (this.isLocalStorageAvailable && (this.defaultConfig.storage === 'both' || this.defaultConfig.storage === 'localStorage')) {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('cache:')) {
              const cacheKey = key.substring(6);
              if (this.shouldInvalidate(cacheKey, pattern)) {
                keysToDelete.push(cacheKey);
              }
            }
          }
        } catch (error) {
          console.warn('Cache localStorage scan error:', error);
        }
      }

      // Delete identified keys
      keysToDelete.forEach(key => {
        this.memoryCache.delete(key);
        if (this.isLocalStorageAvailable && (this.defaultConfig.storage === 'both' || this.defaultConfig.storage === 'localStorage')) {
          try {
            localStorage.removeItem(`cache:${key}`);
          } catch (error) {
            console.warn('Cache invalidation error:', error);
          }
        }
      });
    });
  }

  /**
   * Check if a key should be invalidated based on pattern
   */
  private shouldInvalidate(key: string, pattern: CacheInvalidationPattern): boolean {
    if (!key.startsWith(pattern.table + ':')) {
      return false;
    }

    if (pattern.keys) {
      return pattern.keys.some(k => key.includes(k));
    }

    if (pattern.patterns) {
      return pattern.patterns.some(p => p.test(key));
    }

    // If no specific patterns, invalidate all for the table
    return true;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear();

    if (this.isLocalStorageAvailable && (this.defaultConfig.storage === 'both' || this.defaultConfig.storage === 'localStorage')) {
      try {
        const keysToDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('cache:')) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach(key => localStorage.removeItem(key));
      } catch (error) {
        console.warn('Cache clear error:', error);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memorySize: this.memoryCache.size,
      maxSize: this.defaultConfig.maxSize,
      defaultTtl: this.defaultConfig.ttl
    };
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

/**
 * Decorator function for caching service methods
 */
export function cached(config: CacheConfig & { table: string, invalidateOn?: string[] } = { table: 'unknown' }) {
  return function(_target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const cacheKey = cacheManager.generateKey(
        config.table,
        propertyName,
        args.length > 0 ? { args } : undefined
      );

      // Try to get from cache
      const cached = await cacheManager.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Cache the result
      await cacheManager.set(cacheKey, result, config);

      return result;
    };

    return descriptor;
  };
}

/**
 * Helper function to wrap service methods with caching
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  config: CacheConfig = {}
): Promise<T> {
  // Try to get from cache
  const cached = await cacheManager.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Execute fetch function
  const result = await fetchFn();

  // Cache the result
  await cacheManager.set(key, result, config);

  return result;
}