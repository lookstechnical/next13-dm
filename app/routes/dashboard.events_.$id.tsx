import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { Form, Link, Outlet, redirect, useLoaderData } from "@remix-run/react";
import {
  Calendar,
  DeleteIcon,
  Edit2Icon,
  MapPin,
  MoreVertical,
  User,
  User2,
} from "lucide-react";
import { useState } from "react";
import { SelectField } from "~/components/forms/select";
import { PlayerCard } from "~/components/players/player-card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button copy";
// import RadarAttributes from "~/components/charts/radar";
import { Card } from "~/components/ui/card";
import { CardGrid } from "~/components/ui/card-grid";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "~/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { getSupabaseServerClient } from "~/lib/supabase";
import { cn } from "~/lib/utils";
import { EventService } from "~/services/eventService";
import { GroupService } from "~/services/groupService";
import { EventRegistration } from "~/types";
import { formatDate } from "~/utils/helpers";
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
  const players = event
    ? await eventService.getEventRegistrations(event.id as string)
    : [];

  const groupService = new GroupService(supabaseClient);
  const groups = (await groupService.getGroupsByTeam(user.team.id)) || [];
  return { event, players, groups };
};

export const action: ActionFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
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
};

export default function PlayerPage() {
  const { event, players, groups } = useLoaderData<typeof loader>();
  const [status, setStatus] = useState<string>();
  const [group, setGroup] = useState<string>();

  const getVariant = (player: EventRegistration) => {
    switch (player.status) {
      case "attended":
        return "secondary";
      case "confirmed":
        return "outline";
      case "no_show":
        return "default";
    }
  };

  let filteredPlayers = status
    ? players.filter((p) => p.status === status)
    : players;

  console.log({ group, filteredPlayers });

  filteredPlayers = group
    ? filteredPlayers.filter((p) =>
        p.players.playerGroupMembers?.map((gm) => gm.groupId).includes(group)
      )
    : players;

  return (
    <>
      <div className="w-full flex flex-col gap-12 space-y-10 container px-4 mx-auto py-10 text-foreground">
        <div className="w-full flex flex-col md:flex-row gap-4 md:justify-between items-end md:items-center mb-6 ">
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
            <DropdownMenu>
              <DropdownMenuTrigger>
                <MoreVertical />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="p-0">
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/dashboard/events/${event.id}/register-players`}>
                      Register Players
                    </Link>
                  </Button>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-0">
                  <Form method="DELETE" className="w-full">
                    <Button variant="destructive" className="w-full">
                      Delete
                    </Button>
                  </Form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <div className="bg-card min-h-screen py-10">
        <div className="container mx-auto px-4 flex flex-row items-end  gap-2">
          <SelectField
            name="status"
            label="Attendance"
            onValueChange={(status) =>
              setStatus(status === "all" ? undefined : status)
            }
            options={[
              { id: "all", name: "all" },
              { id: "attended", name: "Attended" },
              { id: "confirmed", name: "Confirmed" },
            ]}
          />
          <SelectField
            name="group"
            label="Group"
            onValueChange={(group) => setGroup(group)}
            options={groups.map((g) => ({ id: g.id, name: g.name }))}
          />
          <div className="w-1/5 text-foreground flex flex-row gap-2 items-center justify-start">
            <User2 /> {filteredPlayers.length}{" "}
            <span className="hidden md:inline-block">players</span>
          </div>
        </div>
        <div className="container mx-auto px-4">
          <CardGrid items={filteredPlayers} name="Players">
            {filteredPlayers.map((player: EventRegistration) => (
              <PlayerCard player={player.players}>
                <div className="flex flex-row w-full ">
                  <Form method="POST" className="w-full">
                    <input
                      type="hidden"
                      name="playerId"
                      value={player.players.id}
                    />
                    <input
                      type="hidden"
                      name="eventId"
                      value={player.eventId}
                    />

                    <Button
                      type="submit"
                      variant={getVariant(player)}
                      className={cn(
                        "w-full flex-1 text-white uppercase border-muted"
                      )}
                    >
                      {player.status}
                    </Button>
                  </Form>
                  <Button className="w-full border-muted" variant="outline">
                    <Link
                      to={`/dashboard/events/${event.id}/report/${player.playerId}`}
                    >
                      Add Report
                    </Link>
                  </Button>
                </div>
              </PlayerCard>
            ))}
          </CardGrid>
          <Outlet />
        </div>
      </div>
    </>
  );
}
