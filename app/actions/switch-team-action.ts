import { ActionFunction, redirect } from "react-router";
import { getUser } from "../loaders/user";
import { scoutService } from "../services/scoutService";

export const switchTeamAction: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  const { currentUser } = await getUser();
  const teamId = formData.get("teamId") as string;
  const currentUrl = formData.get("currentUrl") as string;

  if (teamId) scoutService.updateTeamContext(currentUser.id, teamId);

  return redirect(currentUrl);
};
