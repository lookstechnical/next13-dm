import { ActionFunction, redirect } from "react-router";
import { eventService } from "../services/eventService";
import { EventRegistration } from "../types";

export const registerPlayersAction: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  const selectedPlayers = formData.get("selectedPlayers") as string;

  const selectedPlayersArray = JSON.parse(selectedPlayers);
  const eventId = formData.get("eventId") as string;

  for (const playerId of selectedPlayersArray) {
    const data: Omit<EventRegistration, "id" | "registeredAt" | "players"> = {
      playerId,
      eventId,
      status: "confirmed",
    };

    await eventService.addEventRegistration(data);
  }

  return redirect(`/dashboard/events/${eventId}`);
};
