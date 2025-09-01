import { User } from "../types";
import { convertKeysToCamelCase } from "../utils/helpers";

export class ScoutService {
  client;

  constructor(client: any) {
    this.client = client;
  }

  async getUserByEmail(email: string): Promise<User> {
    const { data, error } = await this.client
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error) throw error;
    return convertKeysToCamelCase(data) || [];
  }

  async updateTeamContext(id: string, team_id: string): Promise<User[]> {
    const { data, error } = await this.client
      .from("users")
      .update({ current_team: team_id })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data || [];
  }

  async getAllScoutsByTeam(teamId: string): Promise<User[]> {
    const { data, error } = await this.client
      .from("team_memberships")
      .select("users(*)")
      .eq("team_id", teamId);

    if (error) throw error;

    // Return users without team memberships to avoid RLS recursion
    // Team memberships are loaded separately in AppContext
    return data.users || [];
  }

  async getAllScouts(): Promise<User[]> {
    const { data, error } = await this.client
      .from("users")
      .select(
        "id, name, email, role, avatar, status, invited_by, invited_at, created_at, updated_at, team_memberships(*, teams(name))"
      )
      .order("name");

    if (error) throw error;

    // Return users without team memberships to avoid RLS recursion
    // Team memberships are loaded separately in AppContext
    return data.map((i) => convertKeysToCamelCase(i)) || [];
  }

  async getScoutById(id: string): Promise<User | null> {
    const { data, error } = await this.client
      .from("users")
      .select(
        "id, name, email, role, avatar, status, invited_by, invited_at, created_at, updated_at"
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }
    if (!data || data.length === 0) return null;

    // Return user without team memberships to avoid RLS recursion
    // Team memberships are loaded separately in AppContext
    return data[0];
  }

  async getScoutsByRole(
    role: "ADMIN" | "HEAD_OF_DEPARTMENT" | "SCOUT" | "COACH"
  ): Promise<User[]> {
    const { data, error } = await this.client
      .from("users")
      .select(
        "id, name, email, role, avatar, status, invited_by, invited_at, created_at, updated_at"
      )
      .eq("role", role)
      .order("name");

    if (error) throw error;

    // Return users without team memberships to avoid RLS recursion
    // Team memberships are loaded separately in AppContext
    return data || [];
  }

  async addScout(scout: User): Promise<User> {
    // Insert into users table
    const { data: userData, error: userError } = await this.client
      .from("users")
      .insert({
        id: scout.id,
        name: scout.name,
        email: scout.email,
        role: scout.role,
        avatar: scout.avatar,
        status: scout.status,
        invited_by: scout.invitedBy,
        invited_at: scout.invitedAt,
        current_team: scout.current_team,
      })
      .select()
      .single();

    if (userError) throw userError;

    // Insert team memberships if they exist
    if (scout.teamMemberships && scout.teamMemberships.length > 0) {
      const memberships = scout.teamMemberships.map((tm) => ({
        user_id: scout.id,
        team_id: tm.teamId,
        role: tm.role,
        joined_at: tm.joinedAt,
      }));

      const { error: membershipError } = await this.client
        .from("team_memberships")
        .insert(memberships);

      if (membershipError) throw membershipError;
    }

    return scout;
  }

  async updateScout(id: string, updates: Partial<User>): Promise<User | null> {
    const updateData: any = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.avatar !== undefined) updateData.avatar = updates.avatar;
    if (updates.status !== undefined) updateData.status = updates.status;

    const { data, error } = await this.client
      .from("users")
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

  async deleteScout(id: string): Promise<boolean> {
    const { error } = await this.client.from("users").delete().eq("id", id);

    if (error) throw error;
    return true;
  }
}
