import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { redirect, useLoaderData } from "@remix-run/react";
import { ItemView } from "~/components/session/item-view";
import SheetPage from "~/components/sheet-page";
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
  const sessionService = new SessionService(supabaseClient);

  const { user: authUser } = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.id, supabaseClient);

  if (!user) {
    return redirect("/");
  }

  const event = await eventService.getEventById(params.id as string);
  const sessionItem = await sessionService.getSessionItemsById(
    params.item_id as string
  );

  return { event, sessionItem };
};

export default function SessionPlan() {
  const { event, sessionItem } = useLoaderData<typeof loader>();

  return (
    <SheetPage
      backLink={`/dashboard/events/${event.id}/session-plan`}
      title={sessionItem.drills?.name}
      description="Add Report"
    >
      <ItemView item={sessionItem.drills} />
    </SheetPage>
  );
}
