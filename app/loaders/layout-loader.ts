import { LoaderFunction, redirect } from "react-router";
import { getUser } from "./user";
import { teamService } from "../services/teamService";
import { Team } from "../types";

export const layoutLoader: LoaderFunction = async () => {
  const { currentUser, currentTeam } = await getUser();

  if (!currentUser) {
    throw redirect("/login");
  }

  let teams: Team[] = [{ id: "not" }];
  if (currentUser && currentUser.role === "ADMIN") {
    teams = await teamService.getAllTeams();
  } else if (currentUser) {
    teams = await teamService.getUserTeams(currentUser);
  }

  return { currentUser, currentTeam, teams };
};
