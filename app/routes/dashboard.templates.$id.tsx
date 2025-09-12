import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { redirect, useLoaderData } from "@remix-run/react";
import { TemplateForm } from "~/components/forms/form/template";
import SheetPage from "~/components/sheet-page";

import { getSupabaseServerClient } from "~/lib/supabase";
import { AttributesService } from "~/services/attributesService";
import { TemplateService } from "~/services/templateService";
import { Template } from "~/types";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [
    { title: "Add Event" },
    { name: "description", content: "Add Event" },
  ];
};

export const loader: LoaderFunction = withAuth(
  async ({ request, params, supabaseClient }) => {
    const attributeService = new AttributesService(supabaseClient);
    const templateService = new TemplateService(supabaseClient);

    const attributes = await attributeService.getAllAttributes();
    const template = params.id
      ? await templateService.getTemplateById(params.id)
      : undefined;

    return { attributes, template };
  }
);

export const action: ActionFunction = withAuthAction(
  async ({ request, supabaseClient }) => {
    const templateService = new TemplateService(supabaseClient);

    let formData = await request.formData();
    const name = formData.get("name") as string;
    const attributeIds = formData.get("attributeIds") as string;
    const templateId = formData.get("templateId") as string;

    const data: Omit<Template, "id" | "createdAt"> = {
      name,
      active: true,
    };

    const template = await templateService.updateTemplate(data, templateId);
    const currentAttributeIds = template.templateAttributes.map(
      (o) => o.attributeId
    );

    const selectedAttributesArray = JSON.parse(attributeIds);

    const deleteIds = currentAttributeIds.filter(
      (a) => !selectedAttributesArray.includes(a)
    );

    const insertIds = selectedAttributesArray.filter(
      (a) => !currentAttributeIds.includes(a)
    );

    if (deleteIds) {
      for (const deleteId of deleteIds) {
        await templateService.removeAttributeFromTemplate({
          attribute_id: deleteId,
          template_id: templateId,
        });
      }
    }

    if (insertIds) {
      for (const attributeId of insertIds) {
        try {
          await templateService.addAttributeToTemplate({
            template_id: templateId,
            attribute_id: attributeId,
          });
        } catch (e) {}
      }
    }

    return redirect("/dashboard/templates");
  }
);

export default function TemplateEdit() {
  const { attributes, template } = useLoaderData<typeof loader>();
  return (
    <SheetPage
      backLink="/dashboard/templates"
      title="Update Template"
      description="Update Template"
      hasForm
      updateButton="Update Template"
    >
      <TemplateForm attributes={attributes} template={template} />
    </SheetPage>
  );
}
