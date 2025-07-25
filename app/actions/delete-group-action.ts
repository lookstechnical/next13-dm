import { ActionFunction, redirect } from "react-router";
import { groupService } from "../services/groupService";

export const deleteGroupAction: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  const id = formData.get("groupId") as string;
  const playerid = formData.get("playerId") as string;

  if (playerid) {
    await groupService.removePlayersFromGroup(id, [playerid]);
    return redirect(`/dashboard/groups/${id}`);
  } else {
    await groupService.deleteGroup(id);
    return redirect("/dashboard/groups");
  }
};
