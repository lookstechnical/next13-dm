import { ActionFunction, redirect } from "react-router";
import { getUser } from "../loaders/user";
import { groupService } from "../services/groupService";

export const addGroupPlayersAction: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  const { currentUser } = await getUser();
  const groupId = formData.get("groupId") as string;
  const selectedPlayers = formData.get("selectedPlayers") as string;
  const selectedPlayersArray = JSON.parse(selectedPlayers);

  await groupService.addPlayersToGroup(groupId, selectedPlayersArray);

  return redirect(`/dashboard/groups/${groupId}`);
};
