interface AuthCacheEntry {
  user: any;
  timestamp: number;
  expiresAt: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastRequest: number;
}

/**
 * Auth Rate Limiter and Cache to prevent Supabase auth rate limits
 */
export class AuthRateLimiter {
  private static authCache = new Map<string, AuthCacheEntry>();
  private static rateLimits = new Map<string, RateLimitEntry>();
  
  // Configuration
  private static readonly CACHE_TTL = 30 * 1000; // 30 seconds cache
  private static readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
  private static readonly MAX_REQUESTS_PER_WINDOW = 20; // Supabase limit is ~30/min, use 20 for safety
  private static readonly RETRY_DELAY = 1000; // 1 second base delay
  private static readonly MAX_RETRIES = 3;

  /**
   * Get user with caching and rate limiting
   */
  static async getUser(client: any, forceRefresh: boolean = false): Promise<{ user: any; error: any }> {
    const clientId = this.getClientId(client);
    const now = Date.now();

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.authCache.get(clientId);
      if (cached && now < cached.expiresAt) {
        console.log(`[AuthRateLimiter] Cache HIT for client: ${clientId}`);
        // Import here to avoid circular dependencies
        const { AuthMonitor } = await import('./auth-monitor');
        AuthMonitor.recordSuccess(0, true); // 0ms for cached response
        return { user: cached.user, error: null };
      }
    }

    // Check rate limit
    if (!this.canMakeRequest(clientId)) {
      const rateLimitInfo = this.rateLimits.get(clientId);
      const waitTime = rateLimitInfo ? rateLimitInfo.resetTime - now : 0;
      
      console.warn(`[AuthRateLimiter] Rate limit exceeded for client: ${clientId}. Wait ${waitTime}ms`);
      
      // Return cached user if available, even if expired
      const cached = this.authCache.get(clientId);
      if (cached) {
        console.log(`[AuthRateLimiter] Returning stale cache due to rate limit`);
        return { user: cached.user, error: null };
      }

      // If no cache and rate limited, throw error with retry info
      throw new Error(`Auth rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds before retrying.`);
    }

    // Make the actual auth request with retry logic
    const result = await this.makeAuthRequestWithRetry(client, clientId);
    
    // Cache the result
    if (result.user || result.error?.message !== 'over_request_rate_limit') {
      this.authCache.set(clientId, {
        user: result.user,
        timestamp: now,
        expiresAt: now + this.CACHE_TTL
      });
    }

    return result;
  }

  /**
   * Make auth request with exponential backoff retry
   */
  private static async makeAuthRequestWithRetry(
    client: any, 
    clientId: string, 
    attempt: number = 1
  ): Promise<{ user: any; error: any }> {
    try {
      // Record the request for rate limiting
      this.recordRequest(clientId);
      
      console.log(`[AuthRateLimiter] Making auth request (attempt ${attempt}) for client: ${clientId}`);
      const result = await client.auth.getUser();
      
      console.log(`[AuthRateLimiter] Auth request successful for client: ${clientId}`);
      return result.data ? { user: result.data.user, error: result.error } : result;
      
    } catch (error: any) {
      console.warn(`[AuthRateLimiter] Auth request failed (attempt ${attempt}):`, error.message);
      
      if (error.message?.includes('over_request_rate_limit') && attempt < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`[AuthRateLimiter] Retrying in ${delay}ms...`);
        
        await this.sleep(delay);
        return this.makeAuthRequestWithRetry(client, clientId, attempt + 1);
      }
      
      // If it's a rate limit error and we've exhausted retries, return cached data if available
      if (error.message?.includes('over_request_rate_limit')) {
        const cached = this.authCache.get(clientId);
        if (cached) {
          console.log(`[AuthRateLimiter] Rate limited, returning stale cache`);
          return { user: cached.user, error: null };
        }
      }
      
      return { user: null, error };
    }
  }

  /**
   * Check if client can make a request based on rate limits
   */
  private static canMakeRequest(clientId: string): boolean {
    const now = Date.now();
    const rateLimitInfo = this.rateLimits.get(clientId);

    if (!rateLimitInfo) {
      return true; // First request
    }

    // Reset window if expired
    if (now > rateLimitInfo.resetTime) {
      this.rateLimits.set(clientId, {
        count: 0,
        resetTime: now + this.RATE_LIMIT_WINDOW,
        lastRequest: now
      });
      return true;
    }

    // Check if under limit
    return rateLimitInfo.count < this.MAX_REQUESTS_PER_WINDOW;
  }

  /**
   * Record a request for rate limiting
   */
  private static recordRequest(clientId: string): void {
    const now = Date.now();
    const rateLimitInfo = this.rateLimits.get(clientId);

    if (!rateLimitInfo || now > rateLimitInfo.resetTime) {
      // New window
      this.rateLimits.set(clientId, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW,
        lastRequest: now
      });
    } else {
      // Increment count in current window
      this.rateLimits.set(clientId, {
        ...rateLimitInfo,
        count: rateLimitInfo.count + 1,
        lastRequest: now
      });
    }
  }

  /**
   * Generate client ID for tracking (could be based on user agent, IP, etc.)
   */
  private static getClientId(client: any): string {
    // Use a combination of factors to identify unique clients
    // In a real app, you might use request IP, user agent, session ID, etc.
    return client.supabaseKey?.slice(-10) || 'anonymous';
  }

  /**
   * Sleep utility for delays
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear cache for a specific client
   */
  static clearCache(client: any): void {
    const clientId = this.getClientId(client);
    this.authCache.delete(clientId);
    console.log(`[AuthRateLimiter] Cache cleared for client: ${clientId}`);
  }

  /**
   * Clear all caches
   */
  static clearAllCaches(): void {
    this.authCache.clear();
    this.rateLimits.clear();
    console.log(`[AuthRateLimiter] All caches and rate limits cleared`);
  }

  /**
   * Get cache and rate limit stats
   */
  static getStats() {
    const now = Date.now();
    const activeCaches = Array.from(this.authCache.values()).filter(
      entry => now < entry.expiresAt
    ).length;
    
    const activeRateLimits = Array.from(this.rateLimits.values()).filter(
      limit => now < limit.resetTime
    ).length;

    return {
      activeCaches,
      totalCacheEntries: this.authCache.size,
      activeRateLimits,
      totalRateLimitEntries: this.rateLimits.size,
      configuration: {
        cacheTTL: this.CACHE_TTL,
        rateLimitWindow: this.RATE_LIMIT_WINDOW,
        maxRequestsPerWindow: this.MAX_REQUESTS_PER_WINDOW
      }
    };
  }

  /**
   * Cleanup expired entries
   */
  static cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    // Clean expired cache entries
    for (const [key, entry] of this.authCache.entries()) {
      if (now >= entry.expiresAt) {
        this.authCache.delete(key);
        cleaned++;
      }
    }

    // Clean expired rate limit entries
    for (const [key, limit] of this.rateLimits.entries()) {
      if (now >= limit.resetTime) {
        this.rateLimits.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[AuthRateLimiter] Cleaned up ${cleaned} expired entries`);
    }

    return cleaned;
  }
}

// Auto cleanup every 5 minutes
setInterval(() => {
  AuthRateLimiter.cleanup();
}, 5 * 60 * 1000);