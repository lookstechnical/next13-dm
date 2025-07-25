import { LoaderFunction } from "react-router";
import { attributesService } from "../services/attributesService";

export const attributeManagementLoader: LoaderFunction = async () => {
  try {
    const attributes = await attributesService.getAllAttributes();
    return { attributes };
  } catch (e) {
    console.log(e);
  }
};
