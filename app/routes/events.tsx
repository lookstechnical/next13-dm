import { LoaderFunction } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { EventCard } from "~/components/events/event-card";
import { getSupabaseServerClient } from "~/lib/supabase";
import { EventService } from "~/services/eventService";

export const loader: LoaderFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const eventService = new EventService(supabaseClient);

  const events = await eventService.getAllPublicEvents();

  return { events };
};

export const PublicEvents = () => {
  const { events } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen min-w-screen bg-background text-foreground">
      <div className="w-full py-10 bg-wkbackground">
        <div className="container mx-auto max-w-[50rem] py-10 flex flex-row gap-3 items-end">
          <img src="/logo.png" className="w-20" />
          <div>
            <h1 className="text-4xl">Our upcoming events or camps</h1>
            <p className="text-muted">
              Register for out upcoming Rugby League events and camps
            </p>
          </div>
        </div>
      </div>
      <div className="container mx-auto max-w-[50rem] py-10 ">
        {events?.map((event) => (
          <EventCard event={event} to={() => `/events/${event.id}/register`} />
        ))}
      </div>
      <Outlet />
    </div>
  );
};

export default PublicEvents;
