import { ActionFunction, redirect } from "react-router";
import { Player } from "../types";
import { playerService } from "../services/playerService";

export const editPlayerAction: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  const createdBy = formData.get("scoutId") as string;
  const playerId = formData.get("playerId") as string;
  const avatar = formData.get("avatar");

  const data: Omit<Player, "id"> = {
    name: formData.get("name") as string,
    position: formData.get("position") as string,
    secondaryPosition: formData.get("secondaryPosition") as string,
    dateOfBirth: formData.get("dateOfBirth") as string,
    nationality: formData.get("nationality") as string,
    club: formData.get("club") as string,
    school: formData.get("school") as string,
    height: formData.get("height") as string,
    foot: formData.get("foot") as string,
    photoUrl: formData.get("photoUrl") as string,
    email: formData.get("email") as string,
    scoutId: createdBy,
    teamId: formData.get("teamId") as string,
  };

  await playerService.updatePlayer(playerId, data);

  if (playerId && avatar) {
    await playerService.uploadPlayerProfilePhoto(playerId, avatar);
  }

  return redirect(`/dashboard/players/${playerId}`);
};
