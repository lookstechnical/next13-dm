import { LoaderFunction } from "react-router";
import { templateService } from "../services/templateService";
import { attributesService } from "../services/attributesService";

export const templateLoader: LoaderFunction = async ({ params }) => {
  const template = params.id
    ? await templateService.getTemplateById(params.id)
    : undefined;

  const attributes = (await attributesService.getAllAttributes()) || [];

  return { template, attributes };
};
