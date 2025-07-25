import { LoaderFunction, redirect } from "react-router";
import supabase from "../lib/supabase";
import { getUser } from "./user";
import { eventService } from "../services/eventService";
import { Event, Player, PlayerReport } from "../types";
import { playerService } from "../services/playerService";
import { reportService } from "../services/reportService";

export const playerLoader: LoaderFunction = async ({ params }) => {
  const { currentUser, currentTeam } = await getUser();

  if (!currentUser) {
    throw redirect("/");
  }

  let player: Player = undefined;
  try {
    player = await playerService.getPlayerById(params.id);
  } catch (e) {
    console.log({ e, id: currentTeam });
  }

  const reports = await reportService.getReportsByPlayer(player.id);

  return { currentUser, currentTeam, player, reports };
};
