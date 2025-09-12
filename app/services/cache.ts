/**
 * Advanced cache layer for Supabase services
 * Provides in-memory and localStorage caching with TTL, invalidation, and query-based caching
 */

export interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache entries
  storage?: 'memory' | 'localStorage' | 'netlify' | 'both';
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
    storage: this.getDefaultStorage()
  };

  /**
   * Determine the best default storage option based on environment
   */
  private getDefaultStorage(): 'memory' | 'localStorage' | 'netlify' | 'both' {
    // Check if running in Netlify environment
    if (this.isNetlifyEnvironment()) {
      return 'netlify';
    }
    // Fall back to previous default
    return 'both';
  }

  /**
   * Check if running in Netlify environment
   */
  private isNetlifyEnvironment(): boolean {
    try {
      // Check for Netlify environment variables or context
      return typeof process !== 'undefined' && 
             process.env && 
             (process.env.NETLIFY === 'true' || 
              process.env.NETLIFY_DEV === 'true' ||
              typeof window !== 'undefined' && 
              window.location?.hostname?.includes('netlify'));
    } catch {
      return false;
    }
  }

  /**
   * Check if localStorage is available (browser environment)
   */
  private isLocalStorageAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
    } catch {
      return false;
    }
  }

  /**
   * Get data from Netlify cache (using fetch with cache headers)
   */
  private async getFromNetlifyCache<T>(key: string): Promise<T | null> {
    try {
      if (typeof fetch === 'undefined') return null;
      
      const response = await fetch(`/.netlify/functions/cache?key=${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'max-age=300, stale-while-revalidate=60'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.value || null;
      }
    } catch (error) {
      console.warn('Netlify cache read error:', error);
    }
    return null;
  }

  /**
   * Set data in Netlify cache (using edge functions or KV storage)
   */
  private async setToNetlifyCache<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      if (typeof fetch === 'undefined') return;
      
      await fetch('/.netlify/functions/cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${Math.floor(ttl / 1000)}`
        },
        body: JSON.stringify({
          key,
          value: data,
          ttl
        })
      });
    } catch (error) {
      console.warn('Netlify cache write error:', error);
    }
  }

  /**
   * Delete data from Netlify cache
   */
  private async deleteFromNetlifyCache(key: string): Promise<void> {
    try {
      if (typeof fetch === 'undefined') return;
      
      await fetch(`/.netlify/functions/cache?key=${encodeURIComponent(key)}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.warn('Netlify cache delete error:', error);
    }
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

    // Check Netlify cache if enabled
    if (this.defaultConfig.storage === 'netlify' || this.defaultConfig.storage === 'both') {
      const netlifyData = await this.getFromNetlifyCache<T>(key);
      if (netlifyData !== null) {
        // Store in memory cache for faster subsequent access
        const entry: CacheEntry<T> = {
          data: netlifyData,
          timestamp: Date.now(),
          ttl: this.defaultConfig.ttl,
          key
        };
        this.memoryCache.set(key, entry);
        return netlifyData;
      }
    }

    // Check localStorage if enabled and available (browser only)
    if ((this.defaultConfig.storage === 'both' || this.defaultConfig.storage === 'localStorage') && this.isLocalStorageAvailable()) {
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
    const storage = config.storage ?? this.defaultConfig.storage;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key
    };

    // Store in memory
    this.memoryCache.set(key, entry);

    // Store in Netlify cache if enabled
    if (storage === 'netlify' || storage === 'both') {
      await this.setToNetlifyCache(key, data, ttl);
    }

    // Store in localStorage if enabled and available (browser only)
    if ((storage === 'both' || storage === 'localStorage') && this.isLocalStorageAvailable()) {
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

    toDelete.forEach(async (key) => {
      this.memoryCache.delete(key);
      
      // Clean up from Netlify cache
      if (this.defaultConfig.storage === 'netlify' || this.defaultConfig.storage === 'both') {
        await this.deleteFromNetlifyCache(key);
      }
      
      // Clean up from localStorage
      if ((this.defaultConfig.storage === 'both' || this.defaultConfig.storage === 'localStorage') && this.isLocalStorageAvailable()) {
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

      // Check localStorage
      if ((this.defaultConfig.storage === 'both' || this.defaultConfig.storage === 'localStorage') && this.isLocalStorageAvailable()) {
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
      keysToDelete.forEach(async (key) => {
        this.memoryCache.delete(key);
        
        // Delete from Netlify cache
        if (this.defaultConfig.storage === 'netlify' || this.defaultConfig.storage === 'both') {
          await this.deleteFromNetlifyCache(key);
        }
        
        // Delete from localStorage
        if ((this.defaultConfig.storage === 'both' || this.defaultConfig.storage === 'localStorage') && this.isLocalStorageAvailable()) {
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
  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    // Clear Netlify cache if enabled
    if (this.defaultConfig.storage === 'netlify' || this.defaultConfig.storage === 'both') {
      try {
        await fetch('/.netlify/functions/cache', {
          method: 'DELETE',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
      } catch (error) {
        console.warn('Netlify cache clear error:', error);
      }
    }
    
    // Clear localStorage if enabled
    if ((this.defaultConfig.storage === 'both' || this.defaultConfig.storage === 'localStorage') && this.isLocalStorageAvailable()) {
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