import { ActionFunction, redirect } from "react-router";
import { Template } from "../types";
import { templateService } from "../services/templateService";

export const templateAction: ActionFunction = async ({ request }) => {
  let formData = await request.formData();

  const templateId = formData.get("templateId");
  const attributes = formData.get("selectedAttributes");

  const data: Omit<Template, "id" | "createdAt"> = {
    name: formData.get("name") as string,
    active: formData.get("active") === "on" ? true : false,
  };

  let template = null;
  try {
    if (templateId) {
      template = await templateService.updateTemplate(
        data,
        templateId as string
      );
    } else {
      template = await templateService.addNewTemplate(data);
    }
  } catch (e) {
    console.log({ e });
  }

  if (attributes && template) {
    const attributesArray = JSON.parse(attributes as string);

    for (const attribute of attributesArray) {
      try {
        await templateService.addAttributeToTemplate({
          attribute_id: attribute,
          template_id: template.id,
        });
      } catch (e) {
        console.log({ e });
      }
    }
  }

  return redirect("/dashboard/templates");
};
