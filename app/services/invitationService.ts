import { Invitation, User } from "../types";
import { supabase } from "../lib/supabase";

export class InvitationService {
  async getAllInvitations(): Promise<Invitation[]> {
    const { data, error } = await supabase
      .from("invitations")
      .select("*")
      .order("invited_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getInvitationById(id: string): Promise<Invitation | null> {
    const { data, error } = await supabase
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
    const { data, error } = await supabase
      .from("invitations")
      .select("*")
      .eq("token", token)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }
    return data;
  }

  async getInvitationsByInviter(invitedBy: string): Promise<Invitation[]> {
    const { data, error } = await supabase
      .from("invitations")
      .select("*")
      .eq("invited_by", invitedBy)
      .order("invited_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getPendingInvitations(): Promise<Invitation[]> {
    const { data, error } = await supabase
      .from("invitations")
      .select("*")
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("invited_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createInvitation(
    email: string,
    role: "ADMIN" | "HEAD_OF_DEPARTMENT" | "SCOUT" | "COACH",
    invitedBy: string,
    teamId?: string
  ): Promise<{ success: boolean; message: string; invitation?: Invitation }> {
    // Get current user's auth token
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, message: "User not authenticated" };
    }

    // Call the secure edge function to handle invitation creation
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invitation`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.toLowerCase(),
          role,
          teamId,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.error || "Failed to send invitation",
      };
    }

    return {
      success: true,
      message: `User account created and invitation sent to ${email}! They will receive an email to set up their account. This invitation will expire in 7 days.`,
      invitation: result.invitation,
    };
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
      await supabase
        .from("invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);
      return { success: false, message: "This invitation has expired" };
    }

    // Get current user (should be the invited user)
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser || currentUser.email !== invitation.email) {
      return {
        success: false,
        message: "Please sign in with the invited email address first",
      };
    }

    // Create user profile
    const { error: profileError } = await supabase.from("users").insert({
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
      const { error: membershipError } = await supabase
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
    const { error: updateError } = await supabase
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

    const { data, error } = await supabase
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
    const { error } = await supabase.from("invitations").delete().eq("id", id);

    if (error) throw error;
    return true;
  }
}

// Export singleton instance
export const invitationService = new InvitationService();
