import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { Link, redirect, useLoaderData } from "@remix-run/react";
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
import { EventService } from "~/services/eventService";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const eventService = new EventService(supabaseClient);

  const { user: authUser } = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.id, supabaseClient);

  if (!user) {
    return redirect("/");
  }

  return {};
};

export const action: ActionFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const eventService = new EventService(supabaseClient);
  const formData = await request.formData();

  return {};
};

export default function SessionPlan() {
  const {} = useLoaderData<typeof loader>();

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        // if (!open) {
        //   navigate("/dashboard/");
        // }
      }}
    >
      <SheetContent className="w-full lg:w-2/3 sm:max-w-[100vw]">
        <SheetHeader className="">
          <SheetTitle>Add Library Item</SheetTitle>
          <SheetDescription>Add Library Item</SheetDescription>
        </SheetHeader>
        {/* <Form method="POST"> */}

        <SheetFooter className="absolute bottom-0 w-full p-10 flex flex-row gap-2">
          <Button asChild variant="link">
            <Link to={`/dashboard/attributes`}>Cancel</Link>
          </Button>

          <ActionButton title="Add Attribute" />
        </SheetFooter>
        {/* </Form> */}
      </SheetContent>
    </Sheet>
  );
}
