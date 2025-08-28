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
import { LibraryItemForm } from "~/components/forms/form/lirary-item";
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
import { SessionService } from "~/services/sessionService";
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

  const event = params.id
    ? await eventService.getEventById(params.id)
    : undefined;

  return { event };
};

export const action: ActionFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const sessionService = new SessionService(supabaseClient);

  const formData = await request.formData();

  const data = {
    description: formData.get("description") as string,
    assigned_to: formData.get("assignedTo") as string,
    duration: formData.get("duration") as string,
    drill_id: formData.get("drillId") as string,
    event_id: params.id,
  };

  await sessionService.addSessionItem(data);

  return redirect(`/dashboard/events/${params.id}/session-plan`);
};

export default function SessionPlan() {
  const { event } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          navigate(`/dashboard/events/${event.id}/session-plan`);
        }
      }}
    >
      <SheetContent className="w-full lg:w-2/3 sm:max-w-[100vw]">
        <SheetHeader className="">
          <SheetTitle>Add Library Item</SheetTitle>
          <SheetDescription>Add Library Item</SheetDescription>
        </SheetHeader>
        <Form method="POST">
          <LibraryItemForm />

          <SheetFooter className="absolute bottom-0 w-full p-10 flex flex-row gap-2">
            <Button asChild variant="link">
              <Link to={`/dashboard/events/${event.id}/session-plan`}>
                Cancel
              </Link>
            </Button>

            <ActionButton title="Add Library Item" />
          </SheetFooter>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
