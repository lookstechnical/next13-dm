import { LoaderFunction } from "react-router";
import { matchService } from "../services/matchService";
import { scoutService } from "../services/scoutService";
import { getUser } from "./user";
import { reportService } from "../services/reportService";

export const matchLoader: LoaderFunction = async ({ params }) => {
  const { currentUser, currentTeam } = await getUser();

  let match = undefined;
  try {
    match = params.id ? await matchService.getMatchById(params.id) : undefined;
  } catch (e) {
    console.log({ e });
  }

  let scouts = undefined;
  try {
    scouts =
      (await scoutService.getAllScoutsByTeam(currentUser.current_team)) || [];
  } catch (e) {
    console.log({ e, tid: currentUser });
  }

  let reports = undefined;
  try {
    reports = params.id
      ? await reportService.getReportsByMatch(
          params.id,
          currentUser.current_team
        )
      : [];
  } catch (e) {
    console.log({ e });
  }

  console.log({ currentUser, match, scouts, reports });

  return { currentUser, match, scouts, reports };
};
