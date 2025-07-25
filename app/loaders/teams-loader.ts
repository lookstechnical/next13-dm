import { LoaderFunction, redirect } from "react-router";
import { getUser } from "./user";
import { Invitation, Team } from "../types";
import { teamService } from "../services/teamService";
import { invitationService } from "../services/invitationService";
import { scoutService } from "../services/scoutService";

export const teamsLoader: LoaderFunction = async () => {
  const { currentUser, currentTeam } = await getUser();

  if (!currentUser) {
    throw redirect("/");
  }

  let teams: Team[] = [];
  try {
    teams = await teamService.getAllTeams();
  } catch (e) {
    console.log({ e, id: currentTeam });
  }

  let invitations: Invitation[] = [];
  try {
    invitations = await invitationService.getAllInvitations();
  } catch (e) {
    console.log({ e, id: currentTeam });
  }

  let scouts = await scoutService.getAllScouts();

  return { currentUser, currentTeam, teams, invitations, scouts };
};
