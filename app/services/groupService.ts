import { convertKeysToCamelCase } from "~/utils/helpers";
import { Player, PlayerGroup } from "../types";

export class GroupService {
  client;
  constructor(client: any) {
    this.client = client;
  }

  async getAllGroups(): Promise<PlayerGroup[]> {
    const { data, error } = await this.client
      .from("player_groups")
      .select(
        `
        *,
        player_group_members (
          player_id
        )
      `
      )
      .order("name");

    if (error) throw error;

    // Transform the data to match the expected format
    return (
      data?.map((group) => ({
        ...group,
        playerIds:
          group.player_group_members?.map((member: any) => member.player_id) ||
          [],
      })) || []
    );
  }

  async getGroupById(id: string): Promise<PlayerGroup | null> {
    const { data, error } = await this.client
      .from("player_groups")
      .select(
        `
        *,
        player_group_members (
          player_id,
          players ( name , date_of_birth, position, secondary_position, id, club, photo_url )
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }

    // Transform the data to match the expected format
    return convertKeysToCamelCase({
      ...data,
      playerIds:
        data.player_group_members?.map((member: any) => member.player_id) || [],
    });
  }

  async getGroupsByCreator(createdBy: string): Promise<PlayerGroup[]> {
    const { data, error } = await this.client
      .from("player_groups")
      .select(
        `
        *,
        player_group_members (
          player_id
        )
      `
      )
      .eq("created_by", createdBy)
      .order("name");

    if (error) throw error;

    // Transform the data to match the expected format
    return (
      data?.map((group) => ({
        ...group,
        playerIds:
          group.player_group_members?.map((member: any) => member.player_id) ||
          [],
      })) || []
    );
  }

  async getGroupsByTeam(teamId: string): Promise<PlayerGroup[]> {
    const { data, error } = await this.client
      .from("player_groups")
      .select(
        `
        *,
        player_group_members (
          player_id,
          players(*)
        )
      `
      )
      .eq("team_id", teamId)
      .order("name");

    if (error) throw error;

    // Transform the data to match the expected format
    return (
      data?.map((group) => ({
        ...group,
        playerIds:
          group.player_group_members?.map((member: any) => member.player_id) ||
          [],
      })) || []
    );
  }

  async getPlayerGroups(playerId: string): Promise<PlayerGroup[]> {
    const { data, error } = await this.client
      .from("player_group_members")
      .select(
        `
        player_groups (
          *,
          player_group_members (
            player_id
          )
        )
      `
      )
      .eq("player_id", playerId);

    if (error) throw error;

    // Transform the data to match the expected format
    return (
      data?.map((item: any) => ({
        ...item.player_groups,
        playerIds:
          item.player_groups.player_group_members?.map(
            (member: any) => member.player_id
          ) || [],
      })) || []
    );
  }

  async createGroup(
    groupData: Omit<PlayerGroup, "id" | "createdAt">,
    createdBy: string
  ): Promise<PlayerGroup> {
    if (!groupData.teamId) {
      throw new Error("Team ID is required for group creation");
    }

    const { data, error } = await this.client
      .from("player_groups")
      .insert({
        team_id: groupData.teamId,
        name: groupData.name,
        description: groupData.description,
        type: groupData.type,
        status: groupData.status,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) throw error;

    // Add initial players if provided
    if (groupData.playerIds && groupData.playerIds.length > 0) {
      const members = groupData.playerIds.map((playerId) => ({
        group_id: data.id,
        player_id: playerId,
        added_by: createdBy,
      }));

      await this.client.from("player_group_members").insert(members);
    }

    return {
      ...data,
      playerIds: groupData.playerIds || [],
    };
  }

  async updateGroup(
    id: string,
    updates: Partial<PlayerGroup>
  ): Promise<PlayerGroup | null> {
    const updateData: any = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.status !== undefined) updateData.status = updates.status;

    const { data, error } = await this.client
      .from("player_groups")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        player_group_members (
          player_id
        )
      `
      )
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return {
      ...data,
      playerIds:
        data.player_group_members?.map((member: any) => member.player_id) || [],
    };
  }

  async addPlayersToGroup(
    groupId: string,
    playerIds: string[]
  ): Promise<PlayerGroup | null> {
    // Get current user for added_by field
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const members = playerIds.map((playerId) => ({
      group_id: groupId,
      player_id: playerId,
      added_by: user.id,
    }));

    const { error } = await this.client
      .from("player_group_members")
      .insert(members);

    if (error) throw error;

    return this.getGroupById(groupId);
  }

  async removePlayersFromGroup(
    groupId: string,
    playerIds: string[]
  ): Promise<PlayerGroup | null> {
    const { data, error } = await this.client
      .from("player_group_members")
      .delete()
      .eq("group_id", groupId)
      .in("player_id", playerIds);

    if (error) throw error;

    return this.getGroupById(groupId);
  }

  async deleteGroup(id: string): Promise<boolean> {
    const { error } = await this.client
      .from("player_groups")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }
}
