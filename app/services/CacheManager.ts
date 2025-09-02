interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheConfig {
  defaultTTL: number; // Default time-to-live in milliseconds
  maxSize: number;    // Maximum cache size
  enableLogging: boolean;
}

/**
 * In-memory cache manager with TTL support and automatic cleanup
 */
export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes default
      maxSize: 1000,
      enableLogging: false,
      ...config
    };

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Generate cache key from components
   */
  generateKey(components: (string | number | boolean | undefined)[]): string {
    return components
      .filter(c => c !== undefined)
      .map(c => String(c))
      .join(':');
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.log(`Cache MISS: ${key}`);
      return null;
    }

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.log(`Cache EXPIRED: ${key}`);
      return null;
    }

    this.log(`Cache HIT: ${key}`);
    return entry.data;
  }

  /**
   * Set data in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Enforce max size by removing oldest entries
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.log(`Cache EVICTED (size limit): ${oldestKey}`);
      }
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.config.defaultTTL
    };

    this.cache.set(key, entry);
    this.log(`Cache SET: ${key} (TTL: ${entry.ttl}ms)`);
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.log(`Cache DELETE: ${key}`);
    }
    return deleted;
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
        this.log(`Cache DELETE (pattern): ${key}`);
      }
    }
    
    return count;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.log(`Cache CLEAR: ${size} entries removed`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    const expired = entries.filter(e => now > e.timestamp + e.ttl).length;
    
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      expired,
      utilization: (this.cache.size / this.config.maxSize) * 100
    };
  }

  /**
   * Manually trigger cleanup of expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        cleaned++;
        this.log(`Cache CLEANUP: ${key}`);
      }
    }

    return cleaned;
  }

  /**
   * Start automatic cleanup interval
   */
  private startCleanup(): void {
    // Cleanup expired entries every 2 minutes
    this.cleanupInterval = setInterval(() => {
      const cleaned = this.cleanup();
      if (cleaned > 0) {
        this.log(`Automatic cleanup: ${cleaned} entries removed`);
      }
    }, 2 * 60 * 1000);
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  /**
   * Log cache operations if enabled
   */
  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log(`[CacheManager] ${message}`);
    }
  }
}

// Predefined cache configurations for different data types
export const CacheConfigs = {
  // Static reference data (attributes, templates) - cache longer
  STATIC_DATA: {
    defaultTTL: 15 * 60 * 1000, // 15 minutes
    maxSize: 200,
    enableLogging: false
  },
  
  // Dynamic user data (players, events) - cache shorter
  DYNAMIC_DATA: {
    defaultTTL: 5 * 60 * 1000,  // 5 minutes
    maxSize: 500,
    enableLogging: false
  },
  
  // Frequently changing data (reports, statistics) - very short cache
  VOLATILE_DATA: {
    defaultTTL: 1 * 60 * 1000,  // 1 minute
    maxSize: 100,
    enableLogging: false
  },
  
  // Development mode with logging
  DEVELOPMENT: {
    defaultTTL: 30 * 1000,      // 30 seconds
    maxSize: 50,
    enableLogging: true
  }
};

// Singleton instances for different cache types
export const staticDataCache = new CacheManager(CacheConfigs.STATIC_DATA);
export const dynamicDataCache = new CacheManager(CacheConfigs.DYNAMIC_DATA);
export const volatileDataCache = new CacheManager(CacheConfigs.VOLATILE_DATA);