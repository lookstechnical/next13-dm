import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { redirect, useLoaderData } from "@remix-run/react";
import { TemplateForm } from "~/components/forms/form/template";
import SheetPage from "~/components/sheet-page";

import { AttributesService } from "~/services/attributesService";
import { TemplateService } from "~/services/templateService";
import { Template } from "~/types";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";
export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [
    { title: "Add Event" },
    { name: "description", content: "Add Event" },
  ];
};

export const loader: LoaderFunction = withAuth(
  async ({ request, supabaseClient }) => {
    const attributeService = new AttributesService(supabaseClient);

    const attributes = await attributeService.getAllAttributes();

    return { attributes };
  }
);

export const action: ActionFunction = withAuthAction(
  async ({ request, supabaseClient }) => {
    const templateService = new TemplateService(supabaseClient);

    let formData = await request.formData();
    const name = formData.get("name") as string;
    const attributeIds = formData.get("attributeIds") as string;

    const data: Omit<Template, "id" | "createdAt"> = {
      name,
      active: true,
    };

    const template = await templateService.addNewTemplate(data);

    if (template.id) {
      const selectedAttributesArray = JSON.parse(attributeIds);

      for (const attributeId of selectedAttributesArray) {
        try {
          await templateService.addAttributeToTemplate({
            template_id: template.id,
            attribute_id: attributeId,
          });
        } catch (e) {}
      }
    }

    return redirect("/dashboard/templates");
  }
);

export default function TemplateCreate() {
  const { attributes } = useLoaderData<typeof loader>();
  return (
    <SheetPage
      backLink="/dashboard/templates"
      title="Add Template"
      description="Add Template"
      hasForm
      updateButton="Create Template"
    >
      <TemplateForm attributes={attributes} />
    </SheetPage>
  );
}
