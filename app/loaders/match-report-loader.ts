import { LoaderFunction } from "react-router";
import { matchService } from "../services/matchService";
import { templateService } from "../services/templateService";

export const matchReportLoader: LoaderFunction = async ({ params }) => {
  const match = params.id
    ? await matchService.getMatchById(params.id)
    : undefined;

  const template =
    match && match.templateId
      ? await templateService.getTemplateById(match.templateId)
      : undefined;

  return { template, match };
};
