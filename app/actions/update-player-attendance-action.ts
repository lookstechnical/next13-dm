import { ActionFunction, redirect } from "react-router";
import { getUser } from "../loaders/user";
import { eventService } from "../services/eventService";

export const updatePlayerAttendanceAction: ActionFunction = async ({
  request,
}) => {
  let formData = await request.formData();
  const playerId = formData.get("playerId") as string;
  const eventId = formData.get("eventId") as string;
  const status = formData.get("status") as "attended" | "no_show";

  await eventService.updateAttendanceById(status, playerId, eventId);

  return redirect(`/dashboard/events/${eventId}/attendance`);
};
