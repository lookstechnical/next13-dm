import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { Link, Outlet, redirect, useLoaderData } from "@remix-run/react";
import { Calendar, MapPin, MoreVertical } from "lucide-react";
import { ActionProtection } from "~/components/action-protection";
import { DeleteConfirm } from "~/components/forms/delete-confirm";
import { AllowedRoles, RouteProtection } from "~/components/route-protections";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button copy";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "~/components/ui/dropdown-menu";
import { EventService } from "~/services/eventService";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";
import { formatDate } from "~/utils/helpers";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = withAuth(
  async ({ params, supabaseClient, user }) => {
    const eventService = new EventService(supabaseClient);
    const event = await eventService.getEventById(params.id as string);

    return { event, user };
  }
);

export const action: ActionFunction = withAuthAction(
  async ({ request, params, supabaseClient }) => {
    const eventService = new EventService(supabaseClient);
    const formData = await request.formData();

    if (request.method === "DELETE") {
      if (params.id) eventService.deleteEvent(params.id);
      return redirect("/dashboard/events");
    } else {
      const playerId = formData.get("playerId");
      const eventId = formData.get("eventId");

      const event =
        playerId && eventId
          ? await eventService.getPlayerEventRegistrationById(
              playerId as string,
              eventId as string
            )
          : undefined;

      if (event) {
        const status = event.status === "confirmed" ? "attended" : "confirmed";
        await eventService.updateAttendanceById(
          status,
          playerId as string,
          eventId as string
        );
      }
    }

    return {};
  }
);

export default function EventPage() {
  const { event, user } = useLoaderData<typeof loader>();

  return (
    <>
      <RouteProtection allowedRoles={AllowedRoles.all} user={user}>
        <div className="w-full flex flex-col container px-4 mx-auto pt-10 text-foreground">
          <div className="w-full flex flex-col md:flex-row gap-0 mg:gap-4 md:justify-between items-end md:items-center mb-6 ">
            <div className="flex flex-row gap-4 w-full md:w-1/2 items-center">
              <div className="flex gap-1 flex-col gap-4">
                <h1 className="text-4xl font-bold text-white flex flex-row gap-2 justify-center items-center">
                  {event.name}
                </h1>
                <p className="text-md flex flex-row gap-2 ">
                  <Calendar /> {formatDate(event.date)}
                </p>

                <p>
                  <span className="flex text-sm flex-row gap-2 ">
                    <MapPin />
                    {event.location}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center gap-4">
              <Badge variant="outline">{event.status}</Badge>
              <ActionProtection
                allowedRoles={AllowedRoles.headOfDept}
                user={user}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <MoreVertical />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="p-0">
                      <Button asChild variant="outline" className="w-full">
                        <Link
                          to={`/dashboard/events/${event.id}/register-players`}
                        >
                          Register Players
                        </Link>
                      </Button>
                    </DropdownMenuItem>
                    <ActionProtection
                      allowedRoles={AllowedRoles.adminOnly}
                      user={user}
                    >
                      <DropdownMenuItem asChild className="p-0">
                        <DeleteConfirm name="Event" id={event.id}>
                          <Button variant="destructive" className="w-full">
                            Delete
                          </Button>
                        </DeleteConfirm>
                      </DropdownMenuItem>
                    </ActionProtection>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ActionProtection>
            </div>
          </div>
          <div>
            <Button asChild variant="outline" className="bg-background ">
              <Link to={`/dashboard/events/${event.id}`}>Players</Link>
            </Button>
            {event.eventType === "training" && (
              <Button asChild variant="outline" className="bg-background ">
                <Link to={`/dashboard/events/${event.id}/session-plan`}>
                  Session plan
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" className="bg-background ">
              <Link to={`/dashboard/events/${event.id}/discussion`}>
                Reflect
              </Link>
            </Button>
          </div>
        </div>
        <div className="bg-card min-h-screen py-10">
          <Outlet />
        </div>
      </RouteProtection>
    </>
  );
}
