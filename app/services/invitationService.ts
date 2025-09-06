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
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }
    return convertKeysToCamelCase(data);
  }

  async createInvitation(playerId: string): Promise<Invitation> {
    const { data: existingInvite } = await this.client
      .from("invitations")
      .select()
      .eq("player_id", playerId)
      .single();

    if (existingInvite) return convertKeysToCamelCase(existingInvite);

    const { data, error } = await this.client
      .from("invitations")
      .insert({
        player_id: playerId,
        status: "pending",
        token: randomString(40),
      })
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }
    return convertKeysToCamelCase(data);
  }

  async rejectInvitation(
    invitation: Invitation,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    if (invitation.status === "accepted") {
      return {
        success: false,
        message: "This invitation has already been used or expired",
      };
    }

    // Mark invitation as rejected
    const { error: updateError } = await this.client
      .from("invitations")
      .update({ status: "rejected", ...(reason && { reason }) })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("Failed to update invitation status:", updateError);
    }

    return { success: true, message: "Profile rejected successfully!" };
  }

  async completeInvitation(
    invitation: Invitation
  ): Promise<{ success: boolean; message: string }> {
    if (invitation.status !== "pending") {
      return {
        success: false,
        message: "This invitation has already been used or expired",
      };
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
