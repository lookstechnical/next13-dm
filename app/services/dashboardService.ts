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

  async getUpcomingBirthdays(
    teamId: string,
    days: number = 7
  ): Promise<
    {
      id: string;
      name: string;
      photoUrl: string | null;
      dateOfBirth: string;
      nextBirthday: string;
      turningAge: number;
    }[]
  > {
    const cacheKey = cacheManager.generateKey(
      "dashboard",
      "getUpcomingBirthdays",
      { teamId, days }
    );

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await this.client
          .from("players")
          .select("id, name, photo_url, date_of_birth")
          .eq("team_id", teamId)
          .not("date_of_birth", "is", null);

        if (error) throw error;

        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const windowEnd = new Date(today);
        windowEnd.setDate(windowEnd.getDate() + days);

        const upcoming = (data || [])
          .map((row: any) => {
            const dob = row.date_of_birth as string;
            if (!dob) return null;
            const [y, m, d] = dob.split("-").map(Number);
            if (!y || !m || !d) return null;

            let next = new Date(today.getFullYear(), m - 1, d);
            if (next < today) {
              next = new Date(today.getFullYear() + 1, m - 1, d);
            }

            if (next < today || next > windowEnd) return null;

            return {
              id: row.id,
              name: row.name,
              photoUrl: row.photo_url,
              dateOfBirth: dob,
              nextBirthday: `${next.getFullYear()}-${String(
                next.getMonth() + 1
              ).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`,
              turningAge: next.getFullYear() - y,
            };
          })
          .filter(
            (p): p is {
              id: string;
              name: string;
              photoUrl: string | null;
              dateOfBirth: string;
              nextBirthday: string;
              turningAge: number;
            } => p !== null
          );

        upcoming.sort(
          (a, b) =>
            a.nextBirthday.localeCompare(b.nextBirthday) ||
            a.name.localeCompare(b.name)
        );

        return upcoming;
      },
      { ttl: CacheTTL.DASHBOARD_STATS }
    );
  }

  async getPlayersByClubSummary(
    teamId: string
  ): Promise<{ club: string; count: number }[]> {
    const cacheKey = cacheManager.generateKey(
      "dashboard",
      "getPlayersByClubSummary",
      { teamId }
    );

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await this.client
          .from("players")
          .select("club")
          .eq("team_id", teamId);

        if (error) throw error;

        const counts = new Map<string, number>();
        for (const row of data || []) {
          const name = (row.club || "").trim();
          if (!name) continue;
          counts.set(name, (counts.get(name) || 0) + 1);
        }

        return Array.from(counts.entries())
          .map(([club, count]) => ({ club, count }))
          .sort((a, b) => b.count - a.count || a.club.localeCompare(b.club));
      },
      { ttl: CacheTTL.DASHBOARD_STATS }
    );
  }
}
