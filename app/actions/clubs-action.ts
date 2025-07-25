import { ActionFunction, redirect } from "react-router";
import { Club } from "../types";
import { clubService } from "../services/clubService";
import { getUser } from "../loaders/user";

export const clubsAction: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  const { currentUser } = await getUser();

  const clubId = formData.get("clubId");

  const data: Omit<Club, "id" | "createdAt"> = {
    name: formData.get("name") as string,
    type: formData.get("type") as
      | "professional"
      | "amateur"
      | "school"
      | "youth"
      | "other",
    location: formData.get("location") as string,
    status: "active",
    createdBy: currentUser.id,
  };

  try {
    if (clubId) {
      await clubService.updateClub(clubId as string, data);
    } else {
      await clubService.createClub(data, currentUser.id);
    }
  } catch (e) {
    console.log({ e });
  }

  return redirect("/dashboard/clubs");
};
