import { LoaderFunction, redirect } from "react-router";
import supabase from "../lib/supabase";
import { getUser } from "./user";
import { eventService } from "../services/eventService";
import { Event } from "../types";

export const eventsLoader: LoaderFunction = async () => {
  const { currentUser, currentTeam } = await getUser();

  if (!currentUser) {
    throw redirect("/");
  }

  let events: Event[] = [];
  try {
    events = currentTeam
      ? await eventService.getEventsByTeam(currentUser.current_team)
      : [];
  } catch (e) {
    console.log({ e, id: currentTeam });
  }

  return { currentUser, currentTeam, events };
};
