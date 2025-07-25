import { ActionFunction, redirect } from "react-router";
import { clubService } from "../services/clubService";

export const deleteClubsAction: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  const id = formData.get("clubId") as string;

  await clubService.deleteClub(id);

  return redirect("/dashboard/clubs");
};
