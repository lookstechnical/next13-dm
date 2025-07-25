import { LoaderFunction, redirect } from "react-router";
import supabase from "../lib/supabase";
import { getUser } from "./user";
import { eventService } from "../services/eventService";
import { Event, PlayerGroup } from "../types";
import { groupService } from "../services/groupService";

export const groupsLoader: LoaderFunction = async () => {
  const { currentUser, currentTeam } = await getUser();

  if (!currentUser) {
    throw redirect("/");
  }

  let groups: PlayerGroup[] = [];
  try {
    groups = currentTeam
      ? await groupService.getGroupsByTeam(currentUser.current_team)
      : [];
  } catch (e) {
    console.log({ e, id: currentTeam });
  }

  return { currentUser, currentTeam, groups };
};
