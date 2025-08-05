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
import { AttributeForm } from "~/components/forms/form/attribute";
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
    ? await attributeService.getAttribueById(params.id)
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

  await attributeService.updateAtrribute(data, id);

  return redirect("/dashboard/attributes");
};

export default function AttributeCreate() {
  const navigate = useNavigate();
  const { attribute } = useLoaderData<typeof loader>();
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          navigate("/dashboard/attributes");
        }
      }}
    >
      <SheetContent className="w-full lg:w-2/3 sm:max-w-[100vw]">
        <SheetHeader className="">
          <SheetTitle>Update Attribute</SheetTitle>
          <SheetDescription>Update a Attribute</SheetDescription>
        </SheetHeader>
        <Form method="POST">
          <AttributeForm attribute={attribute} />

          <SheetFooter className="absolute bottom-0 w-full p-10 flex flex-row gap-2">
            <Button asChild variant="link">
              <Link to={`/dashboard/attributes`}>Cancel</Link>
            </Button>
            <Button className="text-white" variant="outline" type="submit">
              Update Attribute
            </Button>
          </SheetFooter>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
