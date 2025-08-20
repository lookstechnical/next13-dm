import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { Link, Outlet, redirect, useLoaderData } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { CardGrid } from "~/components/ui/card-grid";
import { getSupabaseServerClient } from "~/lib/supabase";
import { EventService } from "~/services/eventService";
import { GroupService } from "~/services/groupService";
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

  const event = await eventService.getEventById(params.id as string);

  return { event };
};

export default function SessionPlan() {
  const { event } = useLoaderData<typeof loader>();

  return (
    <>
      <div className="bg-card min-h-screen py-10">
        <div className="container mx-auto px-4">
          <div className="w-full flex flex-row justify-between gap-2">
            <div></div>
            <div>
              <Button variant="outline" asChild className="text-white">
                <Link
                  to={`/dashboard/events/${event.id}/session-plan/add-library-item`}
                >
                  Add Library Item
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4">
          <CardGrid items={[]} name="No session Plan items for this event">
            <div>item</div>
          </CardGrid>
        </div>
        <Outlet />
      </div>
    </>
  );
}
