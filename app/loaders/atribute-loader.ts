import { LoaderFunction } from "react-router";
import { attributesService } from "../services/attributesService";

export const attributeLoader: LoaderFunction = async ({ params }) => {
  const attribute = params.id
    ? await attributesService.getAttribueById(params.id)
    : undefined;

  return { attribute };
};
