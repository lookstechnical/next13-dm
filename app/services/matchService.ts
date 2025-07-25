import { Match } from "../types";
import { supabase } from "../lib/supabase";
import { convertKeysToCamelCase } from "../utils/helpers";

export class MatchService {
  async getAllMatches(): Promise<Match[]> {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("date", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getMatchById(id: string): Promise<Match | null> {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }
    return convertKeysToCamelCase(data);
  }

  async getMatchesByScout(scoutId: string): Promise<Match[]> {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .or(`scout_id.eq.${scoutId},assigned_scout_id.eq.${scoutId}`)
      .order("date", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getMatchesByTeam(teamId: string): Promise<Match[]> {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("team_id", teamId)
      .order("date", { ascending: false });

    if (error) throw error;
    return data.map((i) => convertKeysToCamelCase(i)) || [];
  }

  async getAssignedMatches(scoutId: string): Promise<Match[]> {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("assigned_scout_id", scoutId)
      .neq("status", "completed")
      .order("date", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createMatch(
    matchData: Omit<Match, "id" | "status">,
    scoutId: string
  ): Promise<Match> {
    if (!matchData.teamId) {
      throw new Error("Team ID is required for match creation");
    }

    const { data, error } = await supabase
      .from("matches")
      .insert({
        team_id: matchData.teamId,
        date: matchData.date,
        home_team: matchData.homeTeam,
        away_team: matchData.awayTeam,
        venue: matchData.venue,
        competition: matchData.competition,
        age_group: matchData.ageGroup,
        notes: matchData.notes,
        scout_id: scoutId,
        assigned_scout_id: matchData.assignedScoutId,
        template_id: matchData.templateId,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateMatch(
    id: string,
    updates: Partial<Match>
  ): Promise<Match | null> {
    const updateData: any = {};

    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.homeTeam !== undefined) updateData.home_team = updates.homeTeam;
    if (updates.awayTeam !== undefined) updateData.away_team = updates.awayTeam;
    if (updates.venue !== undefined) updateData.venue = updates.venue;
    if (updates.competition !== undefined)
      updateData.competition = updates.competition;
    if (updates.ageGroup !== undefined) updateData.age_group = updates.ageGroup;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.assignedScoutId !== undefined)
      updateData.assigned_scout_id = updates.assignedScoutId;
    if (updates.status !== undefined) updateData.status = updates.status;

    const { data, error } = await supabase
      .from("matches")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  async deleteMatch(id: string): Promise<boolean> {
    const { error } = await supabase.from("matches").delete().eq("id", id);

    if (error) throw error;
    return true;
  }
}

// Export singleton instance
export const matchService = new MatchService();
