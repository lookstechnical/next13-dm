import { SupabaseClient } from "@supabase/supabase-js";
import { convertKeysToCamelCase } from "../utils/helpers";

export class DashboardService {
  client;
  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async getDashboardStats(): Promise<any> {
    const [players, groups, events] = await Promise.all([
      this.client.from("players").select("*", { count: "exact", head: true }),
      this.client
        .from("player_groups")
        .select("*", { count: "exact", head: true }),
      this.client.from("events").select("*", { count: "exact", head: true }),
    ]);

    const counts = {
      players: players.count,
      groups: groups.count,
      events: events.count,
    };

    return convertKeysToCamelCase(counts) || null;
  }
}
