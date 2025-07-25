import { LoaderFunction, redirect } from "react-router";
import supabase from "../lib/supabase";
import { getUser } from "./user";
import { eventService } from "../services/eventService";
import { Event, Player, PlayerGroup } from "../types";
import { groupService } from "../services/groupService";
import { playerService } from "../services/playerService";

export const groupLoader: LoaderFunction = async ({ params }) => {
  const { currentUser, currentTeam } = await getUser();

  if (!currentUser) {
    throw redirect("/");
  }

  let group: PlayerGroup = undefined;
  if (params.id) {
    try {
      group = currentTeam ? await groupService.getGroupById(params.id) : [];
    } catch (e) {
      console.log({ e, id: currentTeam });
    }
  }

  let players: Player[] = [];
  if (params.id) {
    try {
      players = currentTeam
        ? await playerService.getPlayersByTeam(currentTeam.id)
        : [];
    } catch (e) {
      console.log({ e, id: currentTeam });
    }
  }

  return { currentUser, currentTeam, group, players };
};
