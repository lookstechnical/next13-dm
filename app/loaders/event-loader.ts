import { LoaderFunction, redirect } from "react-router";
import supabase from "../lib/supabase";
import { getUser } from "./user";
import { eventService } from "../services/eventService";
import { Event, Player, PlayerReport } from "../types";
import { reportService } from "../services/reportService";

export const eventLoader: LoaderFunction = async ({ params }) => {
  const { currentUser, currentTeam } = await getUser();

  if (!currentUser) {
    throw redirect("/");
  }

  let event: Event | null;
  try {
    event = await eventService.getEventById(params.id);
  } catch (e) {
    console.log({ e, id: currentTeam });
  }

  let registeredPlayers: Player[] = [];
  try {
    registeredPlayers = (
      await eventService.getEventRegistrations(params.id)
    ).map((reg) => ({ ...reg.players, status: reg.status }));
  } catch (e) {
    console.log({ e, id: currentTeam });
  }

  let reports: PlayerReport[] = [];
  try {
    reports = params.id
      ? await reportService.getReportsByEvent(params.id, currentUser.id)
      : [];
  } catch (e) {
    console.log({ e, id: currentTeam });
  }
  return { currentUser, currentTeam, event, registeredPlayers, reports };
};
