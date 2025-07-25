import { LoaderFunction, redirect } from "react-router";
import supabase from "../lib/supabase";
import { getUser } from "./user";
import { eventService } from "../services/eventService";
import { Event, Player } from "../types";
import { playerService } from "../services/playerService";
import { clubService } from "../services/clubService";

export const playerFormLoader: LoaderFunction = async ({ params }) => {
  const { currentUser, currentTeam } = await getUser();

  if (!currentUser) {
    throw redirect("/");
  }

  let player: Player = undefined;
  try {
    player = params.id
      ? await playerService.getPlayerById(params.id)
      : undefined;
  } catch (e) {
    console.log({ e, id: currentTeam });
  }

  let clubs: Player = undefined;
  try {
    clubs = await clubService.getAllClubs();
  } catch (e) {
    console.log({ e, id: currentTeam });
  }

  return { currentUser, currentTeam, player, clubs };
};
