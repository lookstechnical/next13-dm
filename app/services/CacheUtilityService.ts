import { staticDataCache, dynamicDataCache, volatileDataCache } from "./CacheManager";

/**
 * Utility service for manual cache management and monitoring
 */
export class CacheUtilityService {
  /**
   * Get comprehensive cache statistics across all cache instances
   */
  static getAllCacheStats() {
    return {
      staticData: staticDataCache.getStats(),
      dynamicData: dynamicDataCache.getStats(),
      volatileData: volatileDataCache.getStats()
    };
  }

  /**
   * Clear all caches
   */
  static clearAllCaches(): void {
    staticDataCache.clear();
    dynamicDataCache.clear();
    volatileDataCache.clear();
    console.log('[CacheUtilityService] All caches cleared');
  }

  /**
   * Clear cache for specific data types
   */
  static clearCacheByType(type: 'static' | 'dynamic' | 'volatile'): void {
    switch (type) {
      case 'static':
        staticDataCache.clear();
        break;
      case 'dynamic':
        dynamicDataCache.clear();
        break;
      case 'volatile':
        volatileDataCache.clear();
        break;
    }
    console.log(`[CacheUtilityService] ${type} cache cleared`);
  }

  /**
   * Invalidate cache for specific table across all cache instances
   */
  static invalidateTableAcrossAllCaches(tableName: string): void {
    const pattern = `^${tableName}:`;
    let totalInvalidated = 0;

    totalInvalidated += staticDataCache.deletePattern(pattern);
    totalInvalidated += dynamicDataCache.deletePattern(pattern);
    totalInvalidated += volatileDataCache.deletePattern(pattern);

    console.log(`[CacheUtilityService] Invalidated ${totalInvalidated} entries for table: ${tableName}`);
  }

  /**
   * Warm up cache for commonly accessed data
   */
  static async warmUpCache(services: {
    attributesService?: any,
    templateService?: any,
    clubService?: any
  }): Promise<void> {
    console.log('[CacheUtilityService] Starting cache warm-up...');
    
    try {
      const promises: Promise<any>[] = [];

      // Warm up static data
      if (services.attributesService) {
        promises.push(services.attributesService.getAllAttributes());
      }
      if (services.templateService) {
        promises.push(services.templateService.getAllTemplates());
      }
      if (services.clubService) {
        promises.push(services.clubService.getActiveClubs());
      }

      await Promise.all(promises);
      console.log('[CacheUtilityService] Cache warm-up completed');
    } catch (error) {
      console.error('[CacheUtilityService] Cache warm-up failed:', error);
    }
  }

  /**
   * Log detailed cache information for debugging
   */
  static logCacheStatus(): void {
    const stats = this.getAllCacheStats();
    console.log('[CacheUtilityService] Cache Status:');
    console.log('Static Data Cache:', stats.staticData);
    console.log('Dynamic Data Cache:', stats.dynamicData);
    console.log('Volatile Data Cache:', stats.volatileData);
  }

  /**
   * Cleanup expired entries across all caches
   */
  static cleanupAllCaches(): number {
    const staticCleaned = staticDataCache.cleanup();
    const dynamicCleaned = dynamicDataCache.cleanup();
    const volatileCleaned = volatileDataCache.cleanup();
    
    const total = staticCleaned + dynamicCleaned + volatileCleaned;
    console.log(`[CacheUtilityService] Cleaned up ${total} expired entries`);
    
    return total;
  }

  /**
   * Get cache hit rates (requires custom tracking)
   */
  static getCacheHitRates() {
    // This would require additional tracking in the CacheManager
    // For now, return the current utilization
    const stats = this.getAllCacheStats();
    return {
      staticDataUtilization: stats.staticData.utilization,
      dynamicDataUtilization: stats.dynamicData.utilization,
      volatileDataUtilization: stats.volatileData.utilization
    };
  }
}

/**
 * Cache invalidation helpers for specific business events
 */
export class CacheInvalidationService {
  /**
   * Invalidate cache when a player is created/updated/deleted
   */
  static onPlayerChange(playerId?: string): void {
    CacheUtilityService.invalidateTableAcrossAllCaches('players');
    CacheUtilityService.invalidateTableAcrossAllCaches('player_groups');
    // Invalidate dashboard stats as player counts changed
    dynamicDataCache.deletePattern('dashboard_stats:');
  }

  /**
   * Invalidate cache when an event is created/updated/deleted
   */
  static onEventChange(eventId?: string): void {
    CacheUtilityService.invalidateTableAcrossAllCaches('events');
    // Invalidate dashboard stats as event counts changed
    volatileDataCache.deletePattern('dashboard_stats:');
  }

  /**
   * Invalidate cache when a group is created/updated/deleted
   */
  static onGroupChange(groupId?: string): void {
    CacheUtilityService.invalidateTableAcrossAllCaches('player_groups');
    // Invalidate dashboard stats as group counts changed
    volatileDataCache.deletePattern('dashboard_stats:');
  }

  /**
   * Invalidate cache when template/attribute structure changes
   */
  static onTemplateStructureChange(): void {
    CacheUtilityService.invalidateTableAcrossAllCaches('report_templates');
    CacheUtilityService.invalidateTableAcrossAllCaches('report_attributes');
    CacheUtilityService.invalidateTableAcrossAllCaches('template_attributes');
  }
}