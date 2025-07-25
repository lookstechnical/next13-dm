import { ActionFunction, redirect } from "react-router";
import { eventService } from "../services/eventService";
import { EventRegistration } from "../types";
import { groupService } from "../services/groupService";

export const registerGroupsAction: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  const selectedGroups = formData.get("selectedGroups") as string;

  const selectedGroupsArray = JSON.parse(selectedGroups);
  const eventId = formData.get("eventId") as string;

  for (const groupId of selectedGroupsArray) {
    const group = await groupService.getGroupById(groupId);

    if (group) {
      for (const playerId of group.playerIds) {
        const data: Omit<EventRegistration, "id" | "registeredAt" | "players"> =
          {
            playerId,
            eventId,
            status: "confirmed",
          };

        try {
          await eventService.addEventRegistration(data);
        } catch (e) {}
      }
    }
  }

  return redirect(`/dashboard/events/${eventId}`);
};
