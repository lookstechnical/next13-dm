import { LoaderFunction, redirect } from "react-router";
import supabase from "../lib/supabase";
import { getUser } from "./user";
import { eventService } from "../services/eventService";
import { Event, Player } from "../types";
import { playerService } from "../services/playerService";
import { templateService } from "../services/templateService";

export const eventReportLoader: LoaderFunction = async ({ params }) => {
  const { currentUser, currentTeam } = await getUser();

  if (!currentUser) {
    throw redirect("/");
  }

  let event;
  let template;
  try {
    event = params.id ? await eventService.getEventById(params.id) : undefined;

    template =
      event && event.template_id
        ? await templateService.getTemplateById(event.template_id)
        : undefined;
  } catch (e) {
    console.log({ e }, "failed here");
  }

  let player = undefined;
  try {
    player = params.playerId
      ? await playerService.getPlayerById(params.playerId)
      : undefined;
  } catch (e) {
    console.log({ e }, "failed here too");
  }

  return { currentUser, currentTeam, event, player, template };
};
