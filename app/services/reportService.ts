import { SupabaseClient } from "@supabase/supabase-js";
import { PlayerReport, SkillRating } from "../types";
import { convertKeysToCamelCase } from "../utils/helpers";

export class ReportService {
  client;
  constructor(client: SupabaseClient) {
    this.client = client;
  }
  async getAllReports(): Promise<PlayerReport[]> {
    const { data, error } = await this.client
      .from("player_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data?.map(this.transformFromDb) || [];
  }

  async getReportById(id: string): Promise<PlayerReport | null> {
    const { data, error } = await this.client
      .from("player_reports")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }
    return this.transformFromDb(data);
  }

  async getReportsByPlayer(
    playerId: string,
    scoutId?: string,
    isHeadScout?: boolean
  ): Promise<PlayerReport[]> {
    let query = this.client
      .from("player_reports")
      .select(
        "*, report_scores(*,report_attributes(*)), matches(*), events(*), users(*), players(*)"
      )
      .eq("player_id", playerId);

    // Apply scout filtering if not head scout
    if (!isHeadScout && scoutId) {
      query = query.eq("scout_id", scoutId);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;
    return convertKeysToCamelCase(data) || [];
  }

  async getReportsByPlayerIds(
    playerIds: string[],
    scoutId?: string,
    isHeadScout?: boolean
  ): Promise<PlayerReport[]> {
    if (playerIds.length === 0) return [];

    let query = this.client
      .from("player_reports")
      .select("*")
      .in("player_id", playerIds);

    // Apply scout filtering if not head scout
    if (!isHeadScout && scoutId) {
      query = query.eq("scout_id", scoutId);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;
    return data?.map(this.transformFromDb) || [];
  }

  async getReportsByMatch(
    matchId: string,
    scoutId?: string,
    isHeadScout?: boolean
  ): Promise<PlayerReport[]> {
    let query = this.client
      .from("player_reports")
      .select("*")
      .eq("match_id", matchId);

    // Apply scout filtering if not head scout
    if (!isHeadScout && scoutId) {
      query = query.eq("scout_id", scoutId);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;
    return data?.map(this.transformFromDb) || [];
  }

  async getReportsByEvent(
    eventId: string,
    scoutId?: string,
    isHeadScout?: boolean
  ): Promise<PlayerReport[]> {
    let query = this.client
      .from("player_reports")
      .select(
        "*,report_scores(*,report_attributes(*)), matches(*), events(*), users(*)"
      )
      .eq("event_id", eventId);

    // Apply scout filtering if not head scout
    if (!isHeadScout && scoutId) {
      query = query.eq("scout_id", scoutId);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;
    return convertKeysToCamelCase(data) || [];
  }

  async getReportsByScout(scoutId: string): Promise<PlayerReport[]> {
    const { data, error } = await this.client
      .from("player_reports")
      .select("*")
      .eq("scout_id", scoutId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data?.map(this.transformFromDb) || [];
  }

  async createMatchReport(
    reportData: Omit<PlayerReport, "id" | "scoutId" | "createdAt" | "eventId">,
    scoutId: string
  ): Promise<PlayerReport> {
    const { data, error } = await this.client
      .from("player_reports")
      .insert({
        player_id: reportData.playerId,
        match_id: reportData.matchId,
        scout_id: scoutId,
        position: reportData.position,
        suggested_position: reportData.suggestedPosition,
        minutes_from: reportData.minutes.from,
        minutes_to: reportData.minutes.to,
        rating_technique: reportData.rating.technique,
        rating_physical: reportData.rating.physical,
        rating_tactical: reportData.rating.tactical,
        rating_mental: reportData.rating.mental,
        rating_potential: reportData.rating.potential,
        notes: reportData.notes,
      })
      .select()
      .single();

    if (error) throw error;
    return this.transformFromDb(data);
  }

  async createEventReport(
    reportData: Omit<
      PlayerReport,
      "id" | "scoutId" | "createdAt" | "matchId"
    > & { eventId: string },
    scoutId: string
  ): Promise<PlayerReport> {
    const { data, error } = await this.client
      .from("player_reports")
      .insert({
        player_id: reportData.playerId,
        event_id: reportData.eventId,
        scout_id: scoutId,
        position: reportData.position,
        suggested_position: reportData.suggestedPosition,
        notes: reportData.notes,
        template_id: reportData.templateId,
      })
      .select()
      .single();

    if (error) throw error;
    return this.transformFromDb(data);
  }

  async updateReport(
    id: string,
    updates: Partial<PlayerReport>
  ): Promise<PlayerReport | null> {
    const updateData: any = {};

    if (updates.position !== undefined) updateData.position = updates.position;
    if (updates.suggestedPosition !== undefined)
      updateData.suggested_position = updates.suggestedPosition;
    if (updates.minutes !== undefined) {
      updateData.minutes_from = updates.minutes.from;
      updateData.minutes_to = updates.minutes.to;
    }
    if (updates.rating !== undefined) {
      updateData.rating_technique = updates.rating.technique;
      updateData.rating_physical = updates.rating.physical;
      updateData.rating_tactical = updates.rating.tactical;
      updateData.rating_mental = updates.rating.mental;
      updateData.rating_potential = updates.rating.potential;
    }
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await this.client
      .from("player_reports")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return this.transformFromDb(data);
  }

  async deleteReport(id: string): Promise<boolean> {
    const { error } = await this.client
      .from("player_reports")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }

  async addReportScore(
    attributeId: string,
    reportId: string,
    score: string
  ): Promise<any> {
    const { error } = await this.client.from("report_scores").insert({
      attribute_id: attributeId,
      report_id: reportId,
      score,
    });

    if (error) throw error;
    return true;
  }

  async refreshAverageScores(playerId: string) {
    const { error } = await this.client.rpc("refresh_player_avg_scores", {
      target_player_id: playerId,
    });

    if (error) {
      console.error("Error refreshing score for player:", error);
    } else {
      console.log("Player scores refreshed.");
    }
  }

  async getPlayerOverallRating(
    playerId: string,
    scoutId?: string,
    isHeadScout?: boolean
  ): Promise<Partial<SkillRating>> {
    const playerReports = await this.getReportsByPlayer(
      playerId,
      scoutId,
      isHeadScout
    );

    if (playerReports.length === 0) {
      return {};
    }

    const initialRating = {
      technique: 0,
      physical: 0,
      tactical: 0,
      mental: 0,
      potential: 0,
    };

    const totalRating = playerReports.reduce((acc, report) => {
      return {
        technique: acc.technique + report.rating.technique,
        physical: acc.physical + report.rating.physical,
        tactical: acc.tactical + report.rating.tactical,
        mental: acc.mental + report.rating.mental,
        potential: acc.potential + report.rating.potential,
      };
    }, initialRating);

    return {
      technique: +(totalRating.technique / playerReports.length).toFixed(1),
      physical: +(totalRating.physical / playerReports.length).toFixed(1),
      tactical: +(totalRating.tactical / playerReports.length).toFixed(1),
      mental: +(totalRating.mental / playerReports.length).toFixed(1),
      potential: +(totalRating.potential / playerReports.length).toFixed(1),
    };
  }

  // Transform database row to application format
  private transformFromDb(dbRow: any): PlayerReport {
    return {
      id: dbRow.id,
      playerId: dbRow.player_id,
      matchId: dbRow.match_id,
      eventId: dbRow.event_id,
      scoutId: dbRow.scout_id,
      position: dbRow.position,
      suggestedPosition: dbRow.suggested_position,
      minutes: {
        from: dbRow.minutes_from,
        to: dbRow.minutes_to,
      },
      rating: {
        technique: dbRow.rating_technique,
        physical: dbRow.rating_physical,
        tactical: dbRow.rating_tactical,
        mental: dbRow.rating_mental,
        potential: dbRow.rating_potential,
      },
      notes: dbRow.notes,
      createdAt: dbRow.created_at,
    };
  }
}
