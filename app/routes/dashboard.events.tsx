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
import { Event } from "~/types";
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

  console.log(events);

  function getNextUpcomingEvent(events: Event[]): Event | null {
    const now = new Date();

    // Filter only future events
    const upcoming = events.filter((e) => new Date(e.date) > now);

    if (upcoming.length === 0) return null;

    // Sort by date ascending and take the first
    upcoming.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return upcoming[0];
  }

  function getPreviousEvent(events: Event[]): Event | null {
    const now = new Date();

    const past = events.filter((e) => new Date(e.date) < now);

    if (past.length === 0) return null;

    past.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return past[0];
  }

  const nextEvent = getNextUpcomingEvent(events);
  const prevEvent = getPreviousEvent(events);

  return (
    <div className="flex flex-column space-y-10 container px-4 mx-auto py-10 text-foreground">
      <div className="w-full">
        <ListingHeader
          title="Events"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {nextEvent && (
            <div>
              <h2 className="text-xl text-muted bold mb-2">Next Event</h2>
              <EventCard
                key={nextEvent.id}
                event={nextEvent}
                to={(id) => `/dashboard/events/${id}`}
              />
            </div>
          )}
          {prevEvent && (
            <div>
              <h2 className="text-xl text-muted bold  mb-2">Previous Event</h2>
              <EventCard
                key={prevEvent.id}
                event={prevEvent}
                to={(id) => `/dashboard/events/${id}`}
              />
            </div>
          )}
        </div>
        <CardGrid name={`${user.team.name} has 0 events`} items={events}>
          {events?.map((event: Event) => (
            <EventCard
              key={event.id}
              event={event}
              to={(id) => `/dashboard/events/${id}`}
            />
          ))}
        </CardGrid>
      </div>
      <Outlet />
    </div>
  );
}
