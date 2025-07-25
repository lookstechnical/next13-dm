import { ActionFunction, redirect } from "react-router";
import { Event } from "../types";
import { eventService } from "../services/eventService";
import { getUser } from "../loaders/user";
import supabase from "../lib/supabase";
import { invitationService } from "../services/invitationService";
import { scoutService } from "../services/scoutService";
import { teamService } from "../services/teamService";

export const completeInviteAction: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session.user.id;

  const inviteId = formData.get("inviteId") as string;
  const name = formData.get("name") as string;
  const password = formData.get("name") as string;

  try {
    const invite = await invitationService.getInvitationById(inviteId);

    const { data, error } = await supabase.auth.updateUser({
      password,
    });

    const scout = await scoutService.addScout({
      email: invite.email,
      name,
      status: "active",
      id: userId,
      role: invite.role,
      invitedBy: invite?.invitedBy,
      invitedAt: invite?.invitedAt,
    });

    const member = await teamService.addUserToTeam(
      userId,
      invite?.teamId as string,
      invite.role
    );
  } catch (e) {
    console.log(e);
  }
  return redirect("/dashboard");
};
