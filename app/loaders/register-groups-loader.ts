import { LoaderFunction, redirect } from "react-router";
import { getUser } from "./user";
import { eventService } from "../services/eventService";
import { EventRegistration, Player, PlayerGroup } from "../types";
import { playerService } from "../services/playerService";
import { groupService } from "../services/groupService";

export const registerGroupsLoader: LoaderFunction = async ({ params }) => {
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

  let event;
  try {
    event = params.id ? await eventService.getEventById(params.id) : undefined;
  } catch (e) {
    console.log({ e, id: currentTeam });
  }

  return { currentUser, currentTeam, groups, event };
};
