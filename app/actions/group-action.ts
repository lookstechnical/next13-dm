import { ActionFunction, redirect } from "react-router";
import { PlayerGroup } from "../types";
import { getUser } from "../loaders/user";
import { groupService } from "../services/groupService";

export const groupAction: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  const { currentUser } = await getUser();

  const groupId = formData.get("groupId");

  const data: Omit<PlayerGroup, "id" | "createdAt"> = {
    teamId: currentUser.current_team,
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    type: formData.get("type") as "selection" | "squad" | "program" | "other",
    status: "active",
    createdBy: currentUser.id,
  };

  try {
    if (groupId) {
      await groupService.updateGroup(groupId as string, data);
    } else {
      await groupService.createGroup(data, currentUser.id);
    }
  } catch (e) {
    console.log({ e });
  }

  return redirect("/dashboard/groups");
};
