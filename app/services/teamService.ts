import { Team, TeamMembership, User } from "../types";

export class TeamService {
  client;
  constructor(client: any) {
    this.client = client;
  }

  async getAllTeams(): Promise<Team[]> {
    const { data, error } = await this.client
      .from("teams")
      .select("*")
      .order("name");

    if (error) throw error;
    return data || [];
  }

  async getTeamById(id: string): Promise<Team | null> {
    const { data, error } = await this.client
      .from("teams")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }
    return data;
  }

  async getUserTeams(user: User): Promise<Team[]> {
    // Get user's team memberships first
    const { data: memberships, error: membershipsError } = await this.client
      .from("team_memberships")
      .select("team_id")
      .eq("user_id", user.id);

    if (membershipsError) throw membershipsError;

    if (!memberships || memberships.length === 0) {
      return [];
    }

    // Get team details separately
    const teamIds = memberships.map((m) => m.team_id);
    const { data: teams, error: teamsError } = await this.client
      .from("teams")
      .select("*")
      .in("id", teamIds);

    if (teamsError) throw teamsError;
    return teams || [];
  }

  getUserRoleInTeam(
    user: User,
    teamId: string
  ): "ADMIN" | "HEAD_OF_DEPARTMENT" | "SCOUT" | "COACH" | null {
    if (!user.teamMemberships) return null;

    const membership = user.teamMemberships.find((m) => m.teamId === teamId);
    return membership ? membership.role : null;
  }

  async createTeam(
    teamData: Omit<Team, "id" | "createdAt">,
    createdBy: string
  ): Promise<Team> {
    const { data, error } = await this.client
      .from("teams")
      .insert({
        name: teamData.name,
        description: teamData.description,
        type: teamData.type,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team | null> {
    const { data, error } = await this.client
      .from("teams")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  async deleteTeam(id: string): Promise<boolean> {
    const { error } = await this.client.from("teams").delete().eq("id", id);

    if (error) throw error;
    return true;
  }

  async addUserToTeam(
    userId: string,
    teamId: string,
    role: "ADMIN" | "HEAD_OF_DEPARTMENT" | "SCOUT" | "COACH"
  ): Promise<void> {
    const { error } = await this.client.from("team_memberships").insert({
      user_id: userId,
      team_id: teamId,
      role,
    });

    if (error) throw error;
  }
}
