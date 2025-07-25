import { Player } from "../types";
import { convertKeysToCamelCase } from "../utils/helpers";

export class PlayerService {
  client;
  constructor(client: any) {
    this.client = client;
  }

  async getAllPlayers(): Promise<Player[]> {
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
        updated_at
      `
      )
      .order("name");

    if (error) throw error;
    return (data || []).map(this.transformFromDb);
  }

  async getPlayerById(id: string): Promise<Player | null> {
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
        updated_at
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }
    return this.transformFromDb(data);
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
        updated_at
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
        updated_at
      `
      )
      .eq("scout_id", scoutId)
      .order("name");

    if (error) throw error;
    return (data || []).map(this.transformFromDb);
  }

  async getPlayersByTeam(teamId: string): Promise<Player[]> {
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
        player_reports(count)
      `
      )
      .eq("team_id", teamId)
      .order("name");

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
        height: playerData.height,
        foot: playerData.foot,
        photo_url: playerData.photoUrl,
        email: playerData.email,
        // scout_id: scoutId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
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
    if (updates.height !== undefined) updateData.height = updates.height;
    if (updates.foot !== undefined) updateData.foot = updates.foot;
    if (updates.photoUrl !== undefined) updateData.photo_url = updates.photoUrl;
    if (updates.email !== undefined) updateData.email = updates.email;

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
    return this.transformFromDb(data);
  }

  async uploadPlayerProfilePhoto(playerId: string, avatar: any) {
    if (avatar) {
      if (!(avatar instanceof File)) {
        return { error: "Invalid file upload." };
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

      const { data } = this.client.storage
        .from("profile-images-public")
        .getPublicUrl(filePath);

      return await this.updatePlayer(playerId, {
        photoUrl: data.publicUrl,
      });
    }
  }

  async deletePlayer(id: string): Promise<boolean> {
    const { error } = await this.client.from("players").delete().eq("id", id);

    if (error) throw error;
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
      height: dbRow.height,
      foot: dbRow.foot,
      photoUrl: dbRow.photo_url,
      email: dbRow.email,
      scoutId: dbRow.scout_id,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
    };
  }
}
