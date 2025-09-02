import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { redirect, useLoaderData } from "@remix-run/react";
import { AttributeForm } from "~/components/forms/form/attribute";
import SheetPage from "~/components/sheet-page";
import { getSupabaseServerClient } from "~/lib/supabase";
import { AttributesService } from "~/services/attributesService";
import { Attribute } from "~/types";
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

  const attribute = params.id
    ? await attributeService.getAttributeById(params.id)
    : undefined;

  return { attribute };
};

export const action: ActionFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const attributeService = new AttributesService(supabaseClient);

  const { user: authUser } = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.id, supabaseClient);

  if (!user) {
    return redirect("/");
  }

  let formData = await request.formData();
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const id = formData.get("attributeId") as string;
  const category = formData.get("category") as string;

  const data: Omit<Attribute, "id" | "createdAt"> = {
    name,
    category,
    description,
  };

  await attributeService.updateAttribute(id, data);

  return redirect("/dashboard/attributes");
};

export default function AttributeEdit() {
  const { attribute } = useLoaderData<typeof loader>();
  return (
    <SheetPage
      hasForm
      backLink="/dashboard/attributes"
      title="Update Attribute"
      description="Update a template attribute"
      updateButton="Update Attribute"
    >
      <AttributeForm attribute={attribute} />
    </SheetPage>
  );
}
