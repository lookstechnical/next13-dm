import { ActionFunction, redirect } from "react-router";
import { playerService } from "../services/playerService";

export const deletePlayerAction: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  const id = formData.get("playerId") as string;

  await playerService.deletePlayer(id);

  return redirect("/dashboard/players");
};
