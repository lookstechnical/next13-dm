/**
 * Cache invalidation service
 * Manages cache invalidation patterns for different data operations
 */

import { cacheManager, CacheInvalidationPattern } from './cache';

export class CacheInvalidationService {
  /**
   * Invalidate cache when players are modified
   */
  static invalidatePlayerCache(teamId?: string, playerId?: string): void {
    const patterns: CacheInvalidationPattern[] = [
      {
        table: 'players',
        patterns: [
          /^players:/,
          teamId ? new RegExp(`team_id.*${teamId}`) : /team_id/,
          playerId ? new RegExp(`player_id.*${playerId}`) : /player_id/,
        ].filter(Boolean)
      }
    ];

    cacheManager.invalidate(patterns);
  }

  /**
   * Invalidate cache when teams are modified
   */
  static invalidateTeamCache(teamId?: string): void {
    const patterns: CacheInvalidationPattern[] = [
      {
        table: 'teams'
      },
      // Also invalidate related player data
      {
        table: 'players',
        patterns: teamId ? [new RegExp(`team_id.*${teamId}`)] : [/team_id/]
      }
    ];

    cacheManager.invalidate(patterns);
  }

  /**
   * Invalidate cache when events are modified
   */
  static invalidateEventCache(teamId?: string, eventId?: string): void {
    const patterns: CacheInvalidationPattern[] = [
      {
        table: 'events',
        patterns: [
          /^events:/,
          teamId ? new RegExp(`team_id.*${teamId}`) : /team_id/,
          eventId ? new RegExp(`event_id.*${eventId}`) : /event_id/,
        ].filter(Boolean)
      },
      {
        table: 'event_registrations',
        patterns: eventId ? [new RegExp(`event_id.*${eventId}`)] : [/event_id/]
      }
    ];

    cacheManager.invalidate(patterns);
  }

  /**
   * Invalidate cache when groups are modified
   */
  static invalidateGroupCache(teamId?: string, groupId?: string): void {
    const patterns: CacheInvalidationPattern[] = [
      {
        table: 'player_groups',
        patterns: [
          /^player_groups:/,
          teamId ? new RegExp(`team_id.*${teamId}`) : /team_id/,
          groupId ? new RegExp(`group_id.*${groupId}`) : /group_id/,
        ].filter(Boolean)
      },
      // Also invalidate player data that depends on groups
      {
        table: 'players',
        patterns: groupId ? [new RegExp(`group_id.*${groupId}`)] : [/group_id/]
      }
    ];

    cacheManager.invalidate(patterns);
  }

  /**
   * Invalidate dashboard statistics cache
   */
  static invalidateDashboardCache(teamId: string): void {
    const patterns: CacheInvalidationPattern[] = [
      {
        table: 'dashboard',
        patterns: [new RegExp(`team_id.*${teamId}`)]
      }
    ];

    cacheManager.invalidate(patterns);
  }

  /**
   * Invalidate all cache related to a team
   */
  static invalidateTeamRelatedCache(teamId: string): void {
    this.invalidateTeamCache(teamId);
    this.invalidatePlayerCache(teamId);
    this.invalidateEventCache(teamId);
    this.invalidateGroupCache(teamId);
    this.invalidateDashboardCache(teamId);
  }

  /**
   * Clear all cache (nuclear option)
   */
  static clearAllCache(): void {
    cacheManager.clear();
  }
}

/**
 * Cache TTL configurations for different data types
 */
export const CacheTTL = {
  // Frequently changing data
  DASHBOARD_STATS: 2 * 60 * 1000, // 2 minutes
  EVENT_REGISTRATIONS: 1 * 60 * 1000, // 1 minute
  
  // Moderately changing data
  PLAYERS: 5 * 60 * 1000, // 5 minutes
  EVENTS: 5 * 60 * 1000, // 5 minutes
  GROUPS: 5 * 60 * 1000, // 5 minutes
  
  // Rarely changing data
  TEAMS: 15 * 60 * 1000, // 15 minutes
  ATTRIBUTES: 15 * 60 * 1000, // 15 minutes
  TEMPLATES: 30 * 60 * 1000, // 30 minutes
  
  // Very stable data
  CLUBS: 60 * 60 * 1000, // 1 hour
} as const;