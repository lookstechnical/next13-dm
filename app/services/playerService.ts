import { Player } from "../types";
import {
  convertKeysToCamelCase,
  getDateRangeForAgeGroup,
} from "../utils/helpers";
import { withCache, cacheManager } from "./cache";
import { CacheInvalidationService, CacheTTL } from "./cacheInvalidation";

type AvScore = { score: string };

export class PlayerService {
  client;
  constructor(client: any) {
    this.client = client;
  }

  async getAllPlayers(): Promise<Player[]> {
    const cacheKey = cacheManager.generateKey("players", "getAllPlayers");

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await this.client
          .from("players")
          .select(
            `
            id,
            team_id,
            name,
            position,
            secondary_position,
            date_of_birth,
            nationality,
            club,
            school,
            height,
            foot,
            photo_url,
            email,
            scout_id,
            created_at,
            updated_at,
            mobile
          `
          )
          .order("name");

        if (error) throw error;
        return (data || []).map(this.transformFromDb);
      },
      { ttl: CacheTTL.PLAYERS }
    );
  }

  async getPlayerById(id: string): Promise<Player | null> {
    const cacheKey = cacheManager.generateKey("players", "getPlayerById", {
      id,
    });

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await this.client
          .from("players")
          .select(
            `
            id,
            mobile,
            team_id,
            name,
            position,
            secondary_position,
            date_of_birth,
            nationality,
            club,
            school,
            height,
            foot,
            photo_url,
            email,
            scout_id,
            created_at,
            updated_at,
            shirt,
            shorts,
            mentor
          `
          )
          .eq("id", id)
          .single();

        if (error) {
          if (error.code === "PGRST116") return null; // Not found
          throw error;
        }
        return convertKeysToCamelCase(data);
      },
      { ttl: CacheTTL.PLAYERS }
    );
  }

  async getPlayerByEmail(email: string): Promise<Player | null> {
    const { data, error } = await this.client
      .from("players")
      .select(
        `
        id,
        team_id,
        name,
        position,
        secondary_position,
        date_of_birth,
        nationality,
        club,
        school,
        height,
        foot,
        photo_url,
        email,
        scout_id,
        created_at,
        updated_at,
        mobile
      `
      )
      .eq("email", email)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }
    return this.transformFromDb(data);
  }

  async getPlayersByScout(scoutId: string): Promise<Player[]> {
    const { data, error } = await this.client
      .from("players")
      .select(
        `
        id,
        team_id,
        name,
        position,
        secondary_position,
        date_of_birth,
        nationality,
        club,
        school,
        height,
        foot,
        photo_url,
        email,
        scout_id,
        created_at,
        updated_at,
        mobile,
        shirt,
        shorts
      `
      )
      .eq("scout_id", scoutId)
      .order("name");

    if (error) throw error;
    return (data || []).map(this.transformFromDb);
  }

  async getPlayersByGroup(
    groupId: string,
    orderBy?: string,
    name?: string,
    ageGroup?: any,
    group?: string,
    position?: string
  ): Promise<Player[]> {
    const query = this.client
      .from("players")
      .select(
        `
        id,
        team_id,
        name,
        position,
        secondary_position,
        date_of_birth,
        club,
        photo_url,
        mobile,
        player_group_members!inner(group_id),
        invitations(status, reason)
      `
      )
      .eq("player_group_members.group_id", groupId);

    if (name) {
      query.ilike("name", `${name}%`);
    }

    if (orderBy) {
      if (orderBy === "score") {
      } else {
        query.order(orderBy);
      }
    } else {
      query.order("name");
    }

    if (position) {
      query.or(`position.eq.${position},secondary_position.eq.${position}`); //.or("secondary_position", position);
    }

    if (ageGroup) {
      const groupFilter = getDateRangeForAgeGroup(ageGroup);
      if (groupFilter) {
        query.gte("date_of_birth", groupFilter.start);
        query.lte("date_of_birth", groupFilter.end);
      }
    }

    const { data, error } = await query;

    let d = data;
    if (group) {
      d = d.filter((p) =>
        p.player_group_members.find((pgm) => pgm.group_id === group)
      );
    }

    if (orderBy === "score") {
      d.sort((a, b) => {
        const scoreA = a.player_avg_scores?.avg_overall_score ?? -Infinity;
        const scoreB = b.player_avg_scores?.avg_overall_score ?? -Infinity;
        return scoreB - scoreA;
      });
    }

    if (error) throw error;
    return convertKeysToCamelCase(d);
  }

  async getPlayersByTeam(
    teamId: string,
    orderBy?: string,
    name?: string,
    ageGroup?: any,
    group?: string,
    position?: string
  ): Promise<Player[]> {
    const query = this.client
      .from("players")
      .select(
        `
        id,
        team_id,
        name,
        position,
        secondary_position,
        date_of_birth,
        club,
        photo_url,
        mobile,
        email,
        player_group_members(group_id),
        mentor(name)
      `
      )
      .eq("team_id", teamId);

    if (name) {
      query.ilike("name", `${name}%`);
    }

    if (orderBy) {
      if (orderBy === "score") {
      } else {
        query.order(orderBy);
      }
    } else {
      query.order("name");
    }

    if (position) {
      query.or(`position.eq.${position},secondary_position.eq.${position}`); //.or("secondary_position", position);
    }

    if (ageGroup) {
      const groupFilter = getDateRangeForAgeGroup(ageGroup);
      if (groupFilter) {
        query.gte("date_of_birth", groupFilter.start);
        query.lte("date_of_birth", groupFilter.end);
      }
    }

    const { data, error } = await query;

    let d = data;
    if (group) {
      d = d.filter((p) =>
        p.player_group_members.find((pgm) => pgm.group_id === group)
      );
    }

    if (orderBy === "score") {
      d.sort((a, b) => {
        const scoreA = a.player_avg_scores?.avg_overall_score ?? -Infinity;
        const scoreB = b.player_avg_scores?.avg_overall_score ?? -Infinity;
        return scoreB - scoreA;
      });
    }

    if (error) throw error;
    return convertKeysToCamelCase(d);
  }

  async getPlayerAverageScores(playerIds: string[]): Promise<AvScore[]> {
    const { data, error } = await this.client
      .from("player_avg_scores")
      .select()
      .in("player_id", playerIds);

    if (error) throw error;
    return convertKeysToCamelCase(data);
  }

  async getPlayersNotInlist(
    teamId: string,
    playerIds: string[]
  ): Promise<Player[]> {
    const { data, error } = await this.client
      .from("players")
      .select(
        `
        id,
        team_id,
        name,
        position,
        secondary_position,
        date_of_birth,
        nationality,
        club,
        school,
        height,
        foot,
        photo_url,
        email,
        scout_id,
        created_at,
        updated_at,
        mobile,
        player_reports(count)
      `
      )
      .eq("team_id", teamId)
      .not("id", "in", `(${playerIds.join(",")})`)
      .order("name");

    if (error) throw error;
    return convertKeysToCamelCase(data);
  }

  async createPlayer(
    playerData: Omit<Player, "id">
    // scoutId: string
  ): Promise<Player> {
    if (!playerData.teamId) {
      throw new Error("Team ID is required for player creation");
    }

    // Validate date format before sending to Supabase
    if (playerData.dateOfBirth) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(playerData.dateOfBirth)) {
        throw new Error(
          `Invalid date format for dateOfBirth. Expected YYYY-MM-DD, got: ${playerData.dateOfBirth}`
        );
      }

      // Validate the date is actually valid
      const testDate = new Date(playerData.dateOfBirth + "T00:00:00.000Z");
      if (isNaN(testDate.getTime())) {
        throw new Error(`Invalid date: ${playerData.dateOfBirth}`);
      }
    }

    const { data, error } = await this.client
      .from("players")
      .insert({
        team_id: playerData.teamId,
        name: playerData.name,
        position: playerData.position,
        secondary_position: playerData.secondaryPosition,
        date_of_birth: playerData.dateOfBirth,
        nationality: playerData.nationality,
        club: playerData.club,
        school: playerData.school,
        photo_url: playerData.photoUrl,
        email: playerData.email,
        mobile: playerData.mobile,
        // scout_id: scoutId,
      })
      .select()
      .single();

    if (error) throw error;

    // Invalidate related cache
    CacheInvalidationService.invalidatePlayerCache(playerData.teamId);

    return data;
  }

  async getFormFields(formData: FormData) {
    const playerId = formData.get("playerId") as string;

    const data: Omit<Player, "id"> = {
      name: formData.get("name") as string,
      position: formData.get("position") as string,
      secondaryPosition: formData.get("secondaryPosition") as string,
      dateOfBirth: formData.get("dateOfBirth") as string,
      nationality: formData.get("nationality") as string,
      club: formData.get("club") as string,
      school: formData.get("school") as string,
      photoUrl: formData.get("photoUrl") as string,
      email: formData.get("email") as string,
      teamId: formData.get("teamId") as string,
      mobile: formData.get("mobile") as string,
      shirt: formData.get("shirt") as string,
      shorts: formData.get("shorts") as string,
      mentor: formData.get("mentor") as string,
    };

    return { data, playerId };
  }

  async updatePlayer(
    id: string,
    updates: Partial<Player>
  ): Promise<Player | null> {
    const updateData: any = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.position !== undefined) updateData.position = updates.position;
    if (updates.secondaryPosition !== undefined)
      updateData.secondary_position = updates.secondaryPosition;
    if (updates.dateOfBirth !== undefined)
      updateData.date_of_birth = updates.dateOfBirth;
    if (updates.nationality !== undefined)
      updateData.nationality = updates.nationality;
    if (updates.club !== undefined) updateData.club = updates.club;
    if (updates.school !== undefined) updateData.school = updates.school;
    if (updates.photoUrl !== undefined) updateData.photo_url = updates.photoUrl;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.mobile !== undefined) updateData.mobile = updates.mobile;
    if (updates.shorts !== undefined) updateData.shorts = updates.shorts;
    if (updates.shirt !== undefined) updateData.shirt = updates.shirt;
    if (updates.mentor !== undefined) updateData.mentor = updates.mentor;

    const { data, error } = await this.client
      .from("players")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    const result = this.transformFromDb(data);

    // Invalidate related cache
    CacheInvalidationService.invalidatePlayerCache(result.teamId, id);

    return result;
  }

  async uploadPlayerProfilePhoto(playerId: string, avatar: any) {
    if (avatar) {
      if (!(avatar instanceof File)) {
        return { error: "Invalid file upload." };
      }

      if (avatar.size === 0) {
        return { error: "empty file" };
      }

      const fileExt = avatar.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${playerId}/${fileName}`;

      const { error } = await this.client.storage
        .from("profile-images-public")
        .upload(filePath, avatar);

      if (error) {
        return { error: error.message };
      }

      const { data, error2 } = this.client.storage
        .from("profile-images-public")
        .getPublicUrl(filePath);

      if (error2) {
        return { error: error2.message };
      }

      return await this.updatePlayer(playerId, {
        photoUrl: data.publicUrl,
      });
    }
  }

  async deletePlayer(id: string): Promise<boolean> {
    // Get player data before deletion for cache invalidation
    const player = await this.getPlayerById(id);

    const { error } = await this.client.from("players").delete().eq("id", id);

    if (error) throw error;

    // Invalidate related cache
    if (player) {
      CacheInvalidationService.invalidatePlayerCache(player.teamId, id);
    }

    return true;
  }

  // Transform database row to application format
  private transformFromDb(dbRow: any): Player {
    return {
      id: dbRow.id,
      teamId: dbRow.team_id,
      name: dbRow.name,
      position: dbRow.position,
      secondaryPosition: dbRow.secondary_position,
      dateOfBirth: dbRow.date_of_birth,
      nationality: dbRow.nationality,
      club: dbRow.club,
      school: dbRow.school,
      ageGroup: "", // Will be calculated by the UI
      photoUrl: dbRow.photo_url,
      email: dbRow.email,
      mobile: dbRow.mobile,
      scoutId: dbRow.scout_id,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
      shirt: dbRow.shirt,
      shorts: dbRow.shorts,
    };
  }
}
