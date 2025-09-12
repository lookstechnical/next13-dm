/**
 * Cache configuration and management
 * Central configuration for all caching behavior in the application
 */

import { cacheManager } from './cache';
import { CacheInvalidationService } from './cacheInvalidation';

export interface CacheStrategy {
  enabled: boolean;
  ttl: number;
  storage: 'memory' | 'localStorage' | 'both';
  maxSize?: number;
  autoInvalidate?: boolean;
}

export const CacheStrategies = {
  // High frequency, short-lived cache for real-time data
  REALTIME: {
    enabled: true,
    ttl: 30 * 1000, // 30 seconds
    storage: 'memory' as const,
    maxSize: 100,
    autoInvalidate: true
  },

  // Medium frequency for user-specific data
  USER_DATA: {
    enabled: true,
    ttl: 2 * 60 * 1000, // 2 minutes
    storage: 'both' as const,
    maxSize: 500,
    autoInvalidate: true
  },

  // Standard cache for most data
  STANDARD: {
    enabled: true,
    ttl: 5 * 60 * 1000, // 5 minutes
    storage: 'both' as const,
    maxSize: 1000,
    autoInvalidate: true
  },

  // Longer cache for stable data
  STABLE: {
    enabled: true,
    ttl: 15 * 60 * 1000, // 15 minutes
    storage: 'both' as const,
    maxSize: 500,
    autoInvalidate: false
  },

  // Very stable data that rarely changes
  PERSISTENT: {
    enabled: true,
    ttl: 60 * 60 * 1000, // 1 hour
    storage: 'both' as const,
    maxSize: 200,
    autoInvalidate: false
  }
} as const;

/**
 * Service-specific cache configurations
 */
export const ServiceCacheConfig = {
  PlayerService: {
    getAllPlayers: CacheStrategies.STANDARD,
    getPlayerById: CacheStrategies.STANDARD,
    getPlayersByTeam: CacheStrategies.USER_DATA,
    getPlayersByGroup: CacheStrategies.USER_DATA,
    getPlayerAverageScores: CacheStrategies.REALTIME
  },

  TeamService: {
    getAllTeams: CacheStrategies.STABLE,
    getTeamById: CacheStrategies.STABLE,
    getUserTeams: CacheStrategies.USER_DATA
  },

  EventService: {
    getAllEvents: CacheStrategies.STANDARD,
    getEventById: CacheStrategies.STANDARD,
    getEventsByTeam: CacheStrategies.USER_DATA,
    getEventRegistrations: CacheStrategies.REALTIME,
    getAllPublicEvents: CacheStrategies.STANDARD
  },

  DashboardService: {
    getDashboardStats: CacheStrategies.REALTIME
  },

  GroupService: {
    getAllGroups: CacheStrategies.STANDARD,
    getGroupById: CacheStrategies.STANDARD,
    getGroupsByTeam: CacheStrategies.USER_DATA
  },

  ClubService: {
    getAllClubs: CacheStrategies.PERSISTENT
  },

  AttributesService: {
    getAttributes: CacheStrategies.PERSISTENT
  }
} as const;

/**
 * Cache monitoring and health utilities
 */
export class CacheMonitor {
  static getHealthStatus() {
    const stats = cacheManager.getStats();
    const memoryUsage = (stats.memorySize / stats.maxSize) * 100;
    
    return {
      ...stats,
      memoryUsagePercent: memoryUsage,
      status: memoryUsage > 90 ? 'critical' : memoryUsage > 75 ? 'warning' : 'healthy'
    };
  }

  static clearStaleCache() {
    // This would be called by the cache manager's cleanup method automatically
    console.log('Cache cleanup triggered');
  }

  static warmupCache(teamId?: string) {
    // Pre-populate cache with commonly accessed data
    if (teamId) {
      console.log(`Warming up cache for team ${teamId}`);
      // Could trigger background loading of common team data
    }
  }

  static getCacheReport(): Record<string, any> {
    const healthStatus = this.getHealthStatus();
    
    return {
      timestamp: new Date().toISOString(),
      health: healthStatus,
      cacheStrategies: Object.keys(ServiceCacheConfig),
      recommendations: this.getRecommendations(healthStatus)
    };
  }

  private static getRecommendations(health: any): string[] {
    const recommendations: string[] = [];
    
    if (health.status === 'critical') {
      recommendations.push('Consider increasing cache size or reducing TTL');
    }
    
    if (health.memoryUsagePercent > 50) {
      recommendations.push('Monitor cache usage patterns');
    }
    
    return recommendations;
  }
}

/**
 * Initialize cache with default settings
 */
export function initializeCache() {
  console.log('Cache system initialized');
  
  // Set up periodic cleanup
  if (typeof window !== 'undefined') {
    setInterval(() => {
      CacheMonitor.clearStaleCache();
    }, 10 * 60 * 1000); // Every 10 minutes
  }
}

/**
 * Environment-specific cache configuration
 */
export function getCacheConfigForEnvironment() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isDevelopment) {
    // Shorter TTL for development to see changes faster
    return {
      ...CacheStrategies.STANDARD,
      ttl: 1 * 60 * 1000 // 1 minute
    };
  }
  
  if (isProduction) {
    // Longer TTL for production for better performance
    return CacheStrategies.STANDARD;
  }
  
  return CacheStrategies.STANDARD;
}