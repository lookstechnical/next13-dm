import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import {
  redirect,
  type LoaderFunction,
  type MetaFunction,
} from "@remix-run/node";
import { Link, Outlet, useLoaderData } from "@remix-run/react";
import { EventCard } from "~/components/events/event-card";
import { ListingHeader } from "~/components/layout/listing-header";
import { MoreActions } from "~/components/layout/more-actions";
import { Button } from "~/components/ui/button";
import { CardGrid } from "~/components/ui/card-grid";
import { getSupabaseServerClient } from "~/lib/supabase";
import { EventService } from "~/services/eventService";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [{ title: "Events" }, { name: "description", content: "Events" }];
};

export const loader: LoaderFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const authUser = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.user.id, supabaseClient);
  if (!user) {
    return redirect("/");
  }
  const playerService = new EventService(supabaseClient);
  const events = (await playerService.getEventsByTeam(user.team.id)) || [];

  return { events, user };
};

export default function Events() {
  const { events, user } = useLoaderData<typeof loader>();
  return (
    <div className="flex flex-column space-y-10 container px-4 mx-auto py-10 text-foreground">
      <div className="w-full">
        <ListingHeader
          title="Events"
          searchPlaceholder="Search Events by Name"
          renderActions={() => {
            if (user.role === "ADMIN" || user.role === "HEAD_OF_DEPARTMENT") {
              return (
                <MoreActions>
                  <DropdownMenuItem asChild>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full border-muted focus:ring-0"
                    >
                      <Link to={`/dashboard/events/create`}>Add Event</Link>
                    </Button>
                  </DropdownMenuItem>
                </MoreActions>
              );
            }

            return null;
          }}
        />
        <CardGrid name={`${user.team.name} has 0 events`} items={events}>
          {events?.map((event: Event) => (
            <EventCard event={event} to={(id) => `/dashboard/events/${id}`} />
          ))}
        </CardGrid>
      </div>
      <Outlet />
    </div>
  );
}
