import { LoaderFunction, redirect } from "react-router";
import { getUser } from "./user";
import type { Match } from "../types";
import { matchService } from "../services/matchService";

export const matchesLoader: LoaderFunction = async () => {
  const { currentUser, currentTeam } = await getUser();

  if (!currentUser) {
    throw redirect("/");
  }

  let matches: Match[] = [];
  try {
    matches = currentTeam
      ? await matchService.getMatchesByTeam(currentUser.current_team)
      : [];
  } catch (e) {
    console.log({ e, id: currentTeam });
  }

  return { currentUser, currentTeam, matches };
};
