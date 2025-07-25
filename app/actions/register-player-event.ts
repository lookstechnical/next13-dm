import { ActionFunction } from "react-router";
import { playerService } from "../services/playerService";
import { eventService } from "../services/eventService";
import supabase from "../lib/supabase";

export const registerPlayerEventAction: ActionFunction = async ({
  request,
}) => {
  let formData = await request.formData();
  const formType = formData.get("formType") as string;
  const email = formData.get("email") as string;

  if (formType === "emailForm") {
    const user = await playerService.getPlayerByEmail(email);

    if (user) {
      return { status: "complete", message: "user registered" };
    }

    return { status: "reg-form", email };
  }

  if (formType === "regForm") {
    const eventId = formData.get("eventId") as string;
    const name = formData.get("name") as string;
    const position = formData.get("position") as string;
    const secondaryPosition = formData.get("secondaryPosition") as string;
    const dateOfBirth = formData.get("datOfBirth") as string;
    const club = formData.get("club") as string;

    const avatar = formData.get("avatar");

    const event = await eventService.getEventById(eventId);
    if (!event) return { status: "error", message: "Event does not exist" };

    const data = {
      email,
      name,
      position,
      secondaryPosition,
      dateOfBirth,
      club,
      teamId: event.teamId,
    };

    const player = await playerService.createPlayer(data);

    if (player) {
      await playerService.uploadPlayerProfilePhoto(player.id, avatar);

      await eventService.addEventRegistration({
        eventId,
        playerId: player.id,
        status: "registered",
        email,
      });

      return { status: "complete", message: "user registered" };
    }
  }

  //   return redirect("/events");
};
