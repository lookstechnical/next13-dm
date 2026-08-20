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

  /**
   * Give every one of these players a usable pending invitation, in bulk.
   *
   * Sending invites to a group has to work whatever state the players are in:
   * players with no invitation get one created, and players carrying an
   * accepted or rejected invitation from a previous season are re-opened with
   * a fresh token so the link in their email actually works. Doing this
   * per-player costs two round trips each, which is far too slow for a whole
   * group inside a serverless function's time budget, so it runs as one select
   * plus at most one insert and one update.
   *
   * Returns a playerId -> invitation map, and the ids of the players whose
   * invitation had to be re-opened so the caller can report it.
   */
  async ensureInvitations(playerIds: string[]): Promise<{
    invitations: Map<string, Invitation>;
    reopened: string[];
  }> {
    const invitations = new Map<string, Invitation>();
    const reopened: string[] = [];
    const unique = [...new Set(playerIds.filter(Boolean))];
    if (unique.length === 0) return { invitations, reopened };

    const { data: existing, error: selectError } = await this.client
      .from("invitations")
      .select()
      .in("player_id", unique);

    if (selectError) throw selectError;

    // A player can end up with more than one row (the old create path inserted
    // a duplicate whenever the single-row lookup errored), so keep the most
    // recently invited one and reuse that.
    const latest = new Map<string, any>();
    for (const row of existing || []) {
      const current = latest.get(row.player_id);
      if (!current || (row.invited_at || "") > (current.invited_at || "")) {
        latest.set(row.player_id, row);
      }
    }

    const stale = [...latest.values()].filter((row) => row.status !== "pending");

    if (stale.length > 0) {
      // Each row needs its own new token, which rules out a single bulk update.
      // Run them concurrently instead — unlike sending email there is no rate
      // limit here, so this stays one round trip's worth of wall clock. An
      // upsert would be one call but would resurrect a row that had been
      // deleted in the meantime, and needs an INSERT policy it shouldn't need.
      const updates = await Promise.all(
        stale.map((row) =>
          this.client
            .from("invitations")
            .update({
              status: "pending",
              reason: null,
              token: randomString(40),
            })
            .eq("id", row.id)
            .select()
            .single()
        )
      );

      for (const { data, error } of updates) {
        if (error) throw error;
        if (!data) continue;
        latest.set(data.player_id, data);
        reopened.push(data.player_id);
      }
    }

    for (const [playerId, row] of latest) {
      invitations.set(playerId, convertKeysToCamelCase(row));
    }

    const missing = unique.filter((id) => !invitations.has(id));
    if (missing.length === 0) return { invitations, reopened };

    const { data: inserted, error: insertError } = await this.client
      .from("invitations")
      .insert(
        missing.map((playerId) => ({
          player_id: playerId,
          status: "pending",
          token: randomString(40),
        }))
      )
      .select();

    if (insertError) throw insertError;

    for (const row of inserted || []) {
      invitations.set(row.player_id, convertKeysToCamelCase(row));
    }

    return { invitations, reopened };
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
