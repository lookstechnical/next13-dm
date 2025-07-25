import { LoaderFunction, redirect } from "react-router";
import { getUser } from "./user";
import { eventService } from "../services/eventService";
import { EventRegistration, Player } from "../types";
import { playerService } from "../services/playerService";

export const registerPlayersLoader: LoaderFunction = async ({ params }) => {
  const { currentUser, currentTeam } = await getUser();

  if (!currentUser) {
    throw redirect("/");
  }

  let players: Player[] = [];
  try {
    players = currentTeam
      ? await playerService.getPlayersByTeam(currentUser.current_team)
      : [];
  } catch (e) {
    console.log({ e, id: currentTeam });
  }

  let event;
  try {
    event = params.id ? await eventService.getEventById(params.id) : undefined;
  } catch (e) {
    console.log({ e, id: currentTeam });
  }

  let eventRegistrations: EventRegistration[] = [];
  try {
    eventRegistrations = params.id
      ? await eventService.getEventRegistrations(params.id)
      : [];
  } catch (e) {
    console.log({ e, id: currentTeam });
  }

  return { currentUser, currentTeam, players, event, eventRegistrations };
};
