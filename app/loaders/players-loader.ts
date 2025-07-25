import { LoaderFunction, redirect } from "react-router";
import supabase from "../lib/supabase";
import { getUser } from "./user";
import { eventService } from "../services/eventService";
import { Event, Player } from "../types";
import { playerService } from "../services/playerService";

export const playersLoader: LoaderFunction = async () => {
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

  return { currentUser, currentTeam, players };
};
