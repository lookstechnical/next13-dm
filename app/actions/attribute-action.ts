import { ActionFunction, redirect } from "react-router";
import { Attribute } from "../types";
import { attributesService } from "../services/attributesService";

export const attributeAction: ActionFunction = async ({ request }) => {
  let formData = await request.formData();

  const attributeId = formData.get("attributeId");

  const data: Omit<Attribute, "id" | "createdAt"> = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    active: formData.get("active") === "on" ? true : false,
  };

  try {
    if (attributeId) {
      await attributesService.updateAtrribute(data, attributeId as string);
    } else {
      await attributesService.addNewAttribue(data);
    }
  } catch (e) {
    console.log({ e });
  }

  return redirect("/dashboard/attributes");
};
