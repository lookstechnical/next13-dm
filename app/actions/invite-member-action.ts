import { ActionFunction, redirect } from "react-router";
import { Event } from "../types";
import { eventService } from "../services/eventService";
import { getUser } from "../loaders/user";
import { invitationService } from "../services/invitationService";
import { scoutService } from "../services/scoutService";

export const inviteMemberAction: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  const { currentUser } = await getUser();
  const email = formData.get("email") as string;
  const role = formData.get("role") as
    | "ADMIN"
    | "HEAD_OF_DEPARTMENT"
    | "SCOUT"
    | "COACH";
  const teamId = formData.get("teamId") as string;

  await invitationService.createInvitation(email, role, currentUser.id, teamId);

  return redirect("/dashboard/events");
};
