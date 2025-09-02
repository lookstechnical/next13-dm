import { SupabaseClient } from "@supabase/supabase-js";
import { convertKeysToCamelCase } from "../utils/helpers";
import { BaseService } from "./BaseService";
import { volatileDataCache } from "./CacheManager";

export class DashboardService extends BaseService {
  constructor(client: SupabaseClient) {
    // Use volatile data cache for dashboard stats (short TTL)
    super(client, volatileDataCache);
  }

  async getDashboardStats(teamId: string): Promise<any> {
    const cacheKey = this.cacheManager.generateKey(['dashboard_stats', teamId]);
    
    // Try cache first
    if (this.cacheEnabled) {
      const cached = this.cacheManager.get(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

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

    const result = convertKeysToCamelCase(counts) || null;
    
    // Cache the result with short TTL (volatile data)
    if (this.cacheEnabled && result) {
      this.cacheManager.set(cacheKey, result);
    }

    return result;
  }
}
