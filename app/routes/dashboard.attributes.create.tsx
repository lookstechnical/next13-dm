import type { ActionFunction, MetaFunction } from "@remix-run/node";
import { redirect } from "@remix-run/react";
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
  const category = formData.get("category") as string;

  const data: Omit<Attribute, "id" | "createdAt"> = {
    name,
    description,
    category,
    active: true,
  };

  await attributeService.addNewAttribue(data);

  return redirect("/dashboard/attributes");
};

export default function AttributeCreate() {
  return (
    <SheetPage
      backLink="/dashboard/attributes"
      hasForm
      title="Add Attributes"
      description="Add a template attribute"
      updateButton="Add Attribute"
    >
      <AttributeForm />
    </SheetPage>
  );
}
