import { LoaderFunction } from "react-router";
import { getUser } from "./user";
import { scoutService } from "../services/scoutService";
import { templateService } from "../services/templateService";

export const addmatchloader: LoaderFunction = async ({ params }) => {
  const { currentUser, currentTeam } = await getUser();

  const scouts =
    (await scoutService.getAllScoutsByTeam(currentUser.current_team)) || [];

  const templates = await templateService.getAllTemplates();

  return { currentUser, currentTeam, scouts, templates };
};
