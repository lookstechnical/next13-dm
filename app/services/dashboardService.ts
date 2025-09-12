import { SupabaseClient } from "@supabase/supabase-js";
import { convertKeysToCamelCase } from "../utils/helpers";
import { withCache, cacheManager } from './cache';
import { CacheTTL } from './cacheInvalidation';

export class DashboardService {
  client;
  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async getDashboardStats(teamId: string): Promise<any> {
    const cacheKey = cacheManager.generateKey('dashboard', 'getDashboardStats', { teamId });
    
    return withCache(
      cacheKey,
      async () => {
        const [players, groups, events] = await Promise.all([
          this.client
            .from("players")
            .select("id", { count: "exact", head: true })
            .eq("team_id", teamId),
          this.client
            .from("player_groups")
            .select("id", { count: "exact", head: true })
            .eq("team_id", teamId),
          this.client
            .from("events")
            .select("id", { count: "exact", head: true })
            .eq("team_id", teamId),
        ]);

        const counts = {
          players: players.count,
          groups: groups.count,
          events: events.count,
        };

        return convertKeysToCamelCase(counts) || null;
      },
      { ttl: CacheTTL.DASHBOARD_STATS }
    );
  }
}
