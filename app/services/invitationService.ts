import { convertKeysToCamelCase } from "~/utils/helpers";
import { Invitation } from "../types";

function randomString(length: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (n) => chars[n % chars.length]).join("");
}

export class InvitationService {
  client: any;
  constructor(client: any) {
    this.client = client;
  }

  async getAllInvitations(): Promise<Invitation[]> {
    const { data, error } = await this.client
      .from("invitations")
      .select("*")
      .order("invited_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getInvitationById(id: string): Promise<Invitation | null> {
    const { data, error } = await this.client
      .from("invitations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }
    return data;
  }

  async getInvitationByToken(token: string): Promise<Invitation | null> {
    const { data, error } = await this.client
      .from("invitations")
      .select("*")
      .eq("token", token)
      .single();

    if (error) {
      console.log({ error });
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }
    return convertKeysToCamelCase(data);
  }

  async createInvitation(
    playerId: string
  ): Promise<{ invitation?: Invitation }> {
    const { data, error } = await this.client
      .from("invitations")
      .insert({
        player_id: playerId,
        status: "pending",
        token: randomString(20),
      })
      .select()
      .single();

    if (error) {
      console.log({ error });
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }
    return convertKeysToCamelCase(data);
  }

  async completeInvitation(
    token: string,
    userData: { name: string; avatar?: string }
  ): Promise<{ success: boolean; message: string }> {
    const invitation = await this.getInvitationByToken(token);

    if (!invitation) {
      return { success: false, message: "Invalid invitation token" };
    }

    if (invitation.status !== "pending") {
      return {
        success: false,
        message: "This invitation has already been used or expired",
      };
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await this.client
        .from("invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);
      return { success: false, message: "This invitation has expired" };
    }

    // Get current user (should be the invited user)
    const {
      data: { user: currentUser },
    } = await this.client.auth.getUser();

    if (!currentUser || currentUser.email !== invitation.email) {
      return {
        success: false,
        message: "Please sign in with the invited email address first",
      };
    }

    // Create user profile
    const { error: profileError } = await this.client.from("users").insert({
      id: currentUser.id,
      name: userData.name,
      email: invitation.email,
      role: invitation.role,
      avatar: userData.avatar,
      invited_by: invitation.invited_by,
      invited_at: invitation.invited_at,
      status: "active",
    });

    if (profileError) {
      return {
        success: false,
        message: `Failed to create profile: ${profileError.message}`,
      };
    }

    // Add team membership if specified
    if (invitation.team_id) {
      const { error: membershipError } = await this.client
        .from("team_memberships")
        .insert({
          user_id: currentUser.id,
          team_id: invitation.team_id,
          role: invitation.role,
        });

      if (membershipError) {
        console.error("Failed to create team membership:", membershipError);
        // Don't fail the whole process for this
      }
    }

    // Mark invitation as accepted
    const { error: updateError } = await this.client
      .from("invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("Failed to update invitation status:", updateError);
    }

    return { success: true, message: "Profile setup completed successfully!" };
  }

  async updateInvitation(
    id: string,
    updates: Partial<Invitation>
  ): Promise<Invitation | null> {
    const updateData: any = {};

    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.role !== undefined) updateData.role = updates.role;

    const { data, error } = await this.client
      .from("invitations")
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

  async deleteInvitation(id: string): Promise<boolean> {
    const { error } = await this.client
      .from("invitations")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }
}
