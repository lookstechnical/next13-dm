import { LoaderFunction } from "react-router";
import { templateService } from "../services/templateService";

export const templatesLoader: LoaderFunction = async () => {
  const templates = await templateService.getAllTemplates();
  return { templates };
};
