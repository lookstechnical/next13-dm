import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import {
  Form,
  Link,
  redirect,
  useLoaderData,
  useNavigate,
} from "@remix-run/react";
import { TemplateForm } from "~/components/forms/form/template";
import ActionButton from "~/components/ui/action-button";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { getSupabaseServerClient } from "~/lib/supabase";
import { AttributesService } from "~/services/attributesService";
import { TemplateService } from "~/services/templateService";
import { Template } from "~/types";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [
    { title: "Add Event" },
    { name: "description", content: "Add Event" },
  ];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const attributeService = new AttributesService(supabaseClient);
  const templateService = new TemplateService(supabaseClient);

  const attributes = await attributeService.getAllAttributes();
  const template = params.id
    ? await templateService.getTemplateById(params.id)
    : undefined;

  return { attributes, template };
};

export const action: ActionFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const templateService = new TemplateService(supabaseClient);

  const { user: authUser } = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.id, supabaseClient);

  if (!user) {
    return redirect("/");
  }

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
};

export default function AttributeCreate() {
  const navigate = useNavigate();
  const { attributes, template } = useLoaderData<typeof loader>();
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          navigate("/dashboard/templates");
        }
      }}
    >
      <SheetContent className="w-full lg:w-2/3 sm:max-w-[100vw]">
        <SheetHeader className="">
          <SheetTitle>Add Template</SheetTitle>
          <SheetDescription>Add a Template</SheetDescription>
        </SheetHeader>
        <Form method="POST">
          <TemplateForm attributes={attributes} template={template} />

          <SheetFooter className="absolute bottom-0 w-full p-10 flex flex-row gap-2">
            <Button asChild variant="link">
              <Link to={`/dashboard/templates`}>Cancel</Link>
            </Button>

            <ActionButton title="Add Attribute" />
          </SheetFooter>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
