import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { Form, Link, Outlet, redirect, useLoaderData } from "@remix-run/react";
import { Calendar, MapPin, MoreVertical, Users2Icon } from "lucide-react";
import { useState } from "react";
import { SelectField } from "~/components/forms/select";
import { DownloadButton } from "~/components/groups/teamsheet-buttton";
import { ListingHeader } from "~/components/layout/listing-header";
import { Avatar } from "~/components/players/avatar";
import { PlayerCard } from "~/components/players/player-card";
import ActionButton from "~/components/ui/action-button";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button copy";
import { Card } from "~/components/ui/card";
import { CardGrid } from "~/components/ui/card-grid";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "~/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import { cn } from "~/lib/utils";
import { GroupService } from "~/services/groupService";
import { PlayerService } from "~/services/playerService";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";
import { formatDate } from "~/utils/helpers";
import { POSITION_GROUPS } from "~/utils/position-groups";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = withAuth(
  async ({ request, params, supabaseClient }) => {
    const eventService = new GroupService(supabaseClient);

    const playerService = new PlayerService(supabaseClient);

    const players = await playerService.getPlayersByGroup(params.id as string);

    const group = await eventService.getGroupById(params.id as string);

    const playerGroupMembers = players;

    const groupPlayerIds = players.map((p: any) => p.id);
    const now = new Date().toISOString();

    const { data: rawEvents } = await supabaseClient
      .from("events")
      .select("id, name, date, location, status")
      .eq("team_id", (group as any).teamId)
      .gte("date", now)
      .order("date", { ascending: true });

    let events: any[] = [];
    if (rawEvents && rawEvents.length > 0 && groupPlayerIds.length > 0) {
      const eventIds = rawEvents.map((e: any) => e.id);
      const { data: registrations } = await supabaseClient
        .from("event_registrations")
        .select(
          "event_id, player_id, status, players ( id, name, position, photo_url )",
        )
        .in("event_id", eventIds)
        .in("player_id", groupPlayerIds)
        .in("status", ["registered", "confirmed", "attended"]);

      events = rawEvents.map((event: any) => ({
        ...event,
        availablePlayers: (registrations || [])
          .filter((r: any) => r.event_id === event.id)
          .map((r: any) => r.players),
      }));
    } else {
      events = (rawEvents || []).map((event: any) => ({
        ...event,
        availablePlayers: [],
      }));
    }

    return { group: { ...group, playerGroupMembers }, events };
  },
);

export const action: ActionFunction = withAuthAction(
  async ({ request, supabaseClient }) => {
    const groupsService = new GroupService(supabaseClient);

    let formData = await request.formData();
    const groupId = formData.get("groupId");
    const playerId = formData.get("playerId");
    const action = formData.get("action");

    if (action === "delete-group") {
      await groupsService.deleteGroup(groupId as string);
      return redirect("/dashboard/groups");
    } else {
      if (playerId && groupId) {
        await groupsService.removePlayersFromGroup(groupId as string, [
          playerId as string,
        ]);
      }
    }

    return { message: "Successfully removed" };
  },
);

export default function PlayerPage() {
  const { group, events } = useLoaderData<typeof loader>();

  // Client-side filter: narrow the players list to those registered for a
  // chosen upcoming event. The loader already resolves each event's
  // `availablePlayers`, so no reload is needed.
  const [eventFilter, setEventFilter] = useState<string>("");

  const selectedEvent = events?.find((e: any) => e.id === eventFilter);
  const availableIds = selectedEvent
    ? new Set(selectedEvent.availablePlayers.map((p: any) => p.id))
    : null;
  const visibleMembers = availableIds
    ? group.playerGroupMembers.filter((p: any) => availableIds.has(p.id))
    : group.playerGroupMembers;

  return (
    <>
      <div className="w-full flex flex-col gap-12 space-y-10 container px-4 mx-auto py-10 text-foreground">
        <div className="w-full flex flex-col md:flex-row md:gap-4 md:justify-between items-end md:items-center mb-6 ">
          <div className="flex flex-row gap-4 w-full md:w-1/2 items-center">
            <div className="flex gap-1 flex-col gap-4">
              <h1 className="text-4xl font-bold text-white flex flex-row gap-2 justify-center items-center">
                {group.name}
              </h1>
              <p className="flex flex-row gap-2">
                <Users2Icon className="w-5" /> {group.playerGroupMembers.length}{" "}
                Members
              </p>
            </div>
          </div>
          <div className="flex justify-between items-center gap-4">
            <Badge variant="outline">{group.status}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <MoreVertical />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="p-0">
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/dashboard/groups/${group.id}/add-players`}>
                      Add Players
                    </Link>
                  </Button>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-0">
                  <DownloadButton
                    players={group.playerGroupMembers}
                    teamName={group.name}
                  />
                </DropdownMenuItem>
                <DropdownMenuItem className="p-0">
                  <Form method="delete" className="w-full">
                    <input type="hidden" name="groupId" value={group.id} />
                    <input type="hidden" name="action" value="delete-group" />
                    <Button
                      variant="outline"
                      className="w-full hover:bg-primary"
                    >
                      Delete Group
                    </Button>
                  </Form>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-0">
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/dashboard/groups/${group.id}/send-invites`}>
                      Send Invites
                    </Link>
                  </Button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <div className="bg-card min-h-screen py-10">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="players" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="players">
                Players ({group.playerGroupMembers.length})
              </TabsTrigger>
              <TabsTrigger value="events">
                Events ({events?.length || 0})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="events">
              {events && events.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {events.map((event: any) => (
                    <Link
                      key={event.id}
                      to={`/dashboard/events/${event.id}`}
                      className="block transition-all hover:opacity-80 active:opacity-60"
                    >
                      <Card className="border-border h-full">
                        <div className="p-6 flex flex-col gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-white">
                              {event.name}
                            </h3>
                            <p className="text-sm flex flex-row gap-2 items-center">
                              <Calendar className="w-4" />
                              {formatDate(event.date)}
                            </p>
                            {event.location && (
                              <p className="text-sm text-muted flex flex-row gap-2 items-center">
                                <MapPin className="w-3" /> {event.location}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-row gap-2 items-center text-sm text-muted">
                            <Users2Icon className="w-4" />
                            <span>
                              {event.availablePlayers.length} of{" "}
                              {group.playerGroupMembers.length} from{" "}
                              {group.name}
                            </span>
                          </div>
                          {event.availablePlayers.length > 0 && (
                            <div className="flex flex-row flex-wrap gap-1">
                              {event.availablePlayers
                                .slice(0, 10)
                                .map((player: any) => (
                                  <div
                                    key={`${event.id}-${player.id}`}
                                    title={player.name}
                                  >
                                    <Avatar
                                      photoUrl={player.photo_url}
                                      name={player.name}
                                      size={16}
                                      containerSize="w-8 h-8"
                                    />
                                  </div>
                                ))}
                              {event.availablePlayers.length > 10 && (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-700">
                                  +{event.availablePlayers.length - 10}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No upcoming events.</p>
              )}
            </TabsContent>
            <TabsContent value="players">
              <ListingHeader
                title={`${group.name} Players`}
                renderFilters={() =>
                  events && events.length > 0 ? (
                    <div className="flex flex-row items-center justify-center gap-4 min-w-[220px]">
                      <SelectField
                        name="event"
                        label=""
                        placeholder="Filter by event"
                        defaultValue={eventFilter}
                        onValueChange={(val) => setEventFilter(val ?? "")}
                        options={events.map((e: any) => ({
                          id: e.id,
                          name: `${e.name} (${formatDate(e.date)})`,
                        }))}
                      />
                    </div>
                  ) : null
                }
              />

              {selectedEvent && (
                <p className="text-muted mb-6">
                  Showing {visibleMembers.length} of{" "}
                  {group.playerGroupMembers.length} members registered for{" "}
                  <span className="text-white">{selectedEvent.name}</span>.
                </p>
              )}

              {POSITION_GROUPS.map((pg) => {
            const players = visibleMembers.filter((p: any) =>
              pg.positions.includes(p.position),
            );
            if (players.length === 0) return null;
            return (
              <section key={pg.label} className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">
                  {pg.label}{" "}
                  <span className="text-muted text-base font-normal">
                    ({players.length})
                  </span>
                </h2>
                <CardGrid items={players} name="Players">
                  {players.map((player: any) => (
                    <PlayerCard
                      key={`group-player-${player.id}`}
                      player={player}
                    >
                      <Form method="delete">
                        <input
                          type="hidden"
                          name="playerId"
                          value={player.id}
                        />
                        <input type="hidden" name="groupId" value={group.id} />
                        <ActionButton
                          className={cn(
                            "w-full text-white uppercase border-muted",
                          )}
                          title="Remove"
                        />
                      </Form>
                    </PlayerCard>
                  ))}
                </CardGrid>
              </section>
            );
          })}
          {(() => {
            const known = new Set(POSITION_GROUPS.flatMap((g) => g.positions));
            const others = visibleMembers.filter(
              (p: any) => !known.has(p.position),
            );
            if (others.length === 0) return null;
            return (
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Other{" "}
                  <span className="text-muted text-base font-normal">
                    ({others.length})
                  </span>
                </h2>
                <CardGrid items={others} name="Players">
                  {others.map((player: any) => (
                    <PlayerCard
                      key={`group-player-${player.id}`}
                      player={player}
                    >
                      <Form method="delete">
                        <input
                          type="hidden"
                          name="playerId"
                          value={player.id}
                        />
                        <input type="hidden" name="groupId" value={group.id} />
                        <ActionButton
                          className={cn(
                            "w-full text-white uppercase border-muted",
                          )}
                          title="Remove"
                        />
                      </Form>
                    </PlayerCard>
                  ))}
                </CardGrid>
              </section>
            );
          })()}
              {visibleMembers.length === 0 && (
                <CardGrid
                  items={[]}
                  name={
                    selectedEvent
                      ? `No members registered for ${selectedEvent.name}`
                      : "Players"
                  }
                />
              )}
            </TabsContent>
          </Tabs>
          <Outlet />
        </div>
      </div>
    </>
  );
}
