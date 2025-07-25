import { ActionFunction, redirect } from "react-router";
import { matchService } from "../services/matchService";
import { Match } from "../types";

export const addMatchAction: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  const createdBy = formData.get("scoutId") as string;
  const assigned = formData.get("assignedScoutId") as string;

  const data: Omit<Match, "id" | "status"> = {
    teamId: formData.get("teamId") as string,
    date: formData.get("date") as string,
    homeTeam: formData.get("homeTeam") as string,
    awayTeam: formData.get("awayTeam") as string,
    venue: formData.get("venue") as string,
    competition: formData.get("competition") as string,
    ageGroup: formData.get("ageGroup") as string,
    notes: formData.get("notes") as string,
    assignedScoutId: assigned !== "" ? assigned : undefined,
    scoutId: createdBy,
    templateId: formData.get("templateId") as string,
  };

  await matchService.createMatch(data, createdBy);

  return redirect("/dashboard/matches");
};
