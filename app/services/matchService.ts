import { Match } from "../types";
import { BaseService } from "./BaseService";

export class MatchService extends BaseService {
  private readonly fieldMapping = {
    teamId: "team_id",
    homeTeam: "home_team",
    awayTeam: "away_team",
    ageGroup: "age_group",
    scoutId: "scout_id",
    assignedScoutId: "assigned_scout_id",
    templateId: "template_id"
  };

  async getAllMatches(): Promise<Match[]> {
    return this.getAll<Match>("matches", "*", "date", undefined);
  }

  async getMatchById(id: string): Promise<Match | null> {
    return this.getById<Match>("matches", id);
  }

  async getMatchesByScout(scoutId: string): Promise<Match[]> {
    const { data, error } = await this.client
      .from("matches")
      .select("*")
      .or(`scout_id.eq.${scoutId},assigned_scout_id.eq.${scoutId}`)
      .order("date", { ascending: false });

    const result = this.transformResponse<Match>(data, error, []);
    return Array.isArray(result) ? result : [];
  }

  async getMatchesByTeam(teamId: string): Promise<Match[]> {
    return this.getByTeam<Match>("matches", teamId, "*", "date");
  }

  async getAssignedMatches(scoutId: string): Promise<Match[]> {
    const { data, error } = await this.client
      .from("matches")
      .select("*")
      .eq("assigned_scout_id", scoutId)
      .neq("status", "completed")
      .order("date", { ascending: false });

    const result = this.transformResponse<Match>(data, error, []);
    return Array.isArray(result) ? result : [];
  }

  async createMatch(
    matchData: Omit<Match, "id" | "status">,
    scoutId: string
  ): Promise<Match> {
    if (!matchData.teamId) {
      throw new Error("Team ID is required for match creation");
    }

    return this.create<Match>("matches", { 
      ...matchData, 
      scoutId, 
      status: "pending" as Match["status"]
    }, this.fieldMapping);
  }

  async updateMatch(
    id: string,
    updates: Partial<Match>
  ): Promise<Match | null> {
    return this.update<Match>("matches", id, updates, this.fieldMapping);
  }

  async deleteMatch(id: string): Promise<boolean> {
    return this.performDelete("matches", id);
  }
}
