import { ActionFunction, redirect } from "react-router";
import { Event } from "../types";
import { eventService } from "../services/eventService";
import { getUser } from "../loaders/user";

export const addEventAction: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  const { currentUser } = await getUser();

  const data: Omit<Event, "id" | "scoutId" | "createdAt"> = {
    teamId: currentUser.current_team,
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    date: formData.get("date") as string,
    endDate: formData.get("endDate") as string,
    location: formData.get("location") as string,
    ageGroup: formData.get("ageGroup") as string,
    maxParticipants: Number(formData.get("maxParticipants")),
    registrationDeadline: formData.get("registrationDeadline") as string,
    cost: Number(formData.get("cost")),
    requirements: formData.get("requirements") as string,
    status: "upcoming",
  };

  await eventService.createEvent(data, currentUser.id);

  return redirect("/dashboard/events");
};
