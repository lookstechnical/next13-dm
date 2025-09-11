import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { Link, Outlet, redirect, useLoaderData } from "@remix-run/react";
import { ActionProtection } from "~/components/action-protection";
import { AllowedRoles } from "~/components/route-protections";
import { SessionDownloadButton } from "~/components/session/download-button";
import { SessionItemCard } from "~/components/session/item-card";
import { Button } from "~/components/ui/button";
import { CardGrid } from "~/components/ui/card-grid";
import { getSupabaseServerClient } from "~/lib/supabase";
import { EventService } from "~/services/eventService";
import { SessionService } from "~/services/sessionService";
import { SessionItem } from "~/types";
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
  const sessionItems = await sessionService.getSessionItemsByEvent(
    params.id as string
  );

  return { event, sessionItems, user };
};

export const action: ActionFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const sessionService = new SessionService(supabaseClient);
  const formData = await request.formData();

  if (request.method === "DELETE") {
    const id = formData.get("id") as string;
    if (id) sessionService.deleteSessionItemsById(id);
    return redirect(`/dashboard/events/${params.id}/session-plan`);
  }
};

export default function SessionPlan() {
  const { event, sessionItems, user } = useLoaderData<typeof loader>();

  return (
    <>
      <div className="bg-card min-h-screen py-10">
        <div className="container mx-auto px-4">
          <div className="w-full flex flex-row justify-between gap-2">
            <div></div>
            <div className="flex flex-row">
              <SessionDownloadButton sessionItems={sessionItems} />
              <ActionProtection
                allowedRoles={AllowedRoles.headOfDept}
                user={user}
              >
                <Button variant="outline" asChild className="text-white">
                  <Link
                    to={`/dashboard/events/${event.id}/session-plan/add-library-item`}
                  >
                    Add Session Item
                  </Link>
                </Button>
              </ActionProtection>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-2">
          <CardGrid
            items={sessionItems || []}
            name="No session Plan items for this event"
            className="w-full flex flex-col gap-2"
          >
            {sessionItems?.map((item: SessionItem) => (
              <SessionItemCard
                key={item.id}
                sessionItem={item}
                to={`/dashboard/events/${event.id}/session-plan/${item.id}`}
                user={user}
              />
            ))}
          </CardGrid>
        </div>
        <Outlet />
      </div>
    </>
  );
}
