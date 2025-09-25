import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { redirect, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { GroupCard } from "~/components/groups/group-card";
import { PlayerCard } from "~/components/players/player-card";
import SheetPage from "~/components/sheet-page";

import { CardGrid } from "~/components/ui/card-grid";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { EventService } from "~/services/eventService";
import { GroupService } from "~/services/groupService";
import { PlayerService } from "~/services/playerService";
import { EventRegistration, Player, PlayerGroup } from "~/types";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = withAuth(
  async ({ params, supabaseClient, user }) => {
    const eventService = new EventService(supabaseClient);
    const playerService = new PlayerService(supabaseClient);
    const groupService = new GroupService(supabaseClient);

    const event = params.id
      ? await eventService.getEventById(params.id)
      : undefined;

    if (!event) return {};

    const eventReg = params.id
      ? await eventService.getEventRegistrations(params.id)
      : [];

    const availablePlayers = await playerService.getPlayersNotInlist(
      user.current_team as string,
      eventReg.map((reg) => reg.playerId)
    );

    const playerGroups = await groupService.getGroupsByTeam(
      user.current_team as string
    );

    return { availablePlayers, event, playerGroups };
  }
);

export const action: ActionFunction = withAuthAction(
  async ({ request, supabaseClient }) => {
    const groupsService = new GroupService(supabaseClient);
    const eventsService = new EventService(supabaseClient);

    let formData = await request.formData();
    const groupIds = formData.get("groupIds") as string;
    const playerIds = formData.get("playerIds") as string;
    const eventId = formData.get("eventId") as string;

    const selectedGroupsArray = JSON.parse(groupIds);
    const selectedPlayersArray = JSON.parse(playerIds);

    for (const groupId of selectedGroupsArray) {
      const group = await groupsService.getGroupById(groupId);

      if (group) {
        for (const playerId of group.playerIds) {
          const data: Omit<
            EventRegistration,
            "id" | "registeredAt" | "players"
          > = {
            playerId,
            eventId,
            status: "confirmed",
          };

          try {
            await eventsService.addEventRegistration(data);
          } catch (e) {}
        }
      }
    }

    for (const playerId of selectedPlayersArray) {
      const data: Omit<EventRegistration, "id" | "registeredAt" | "players"> = {
        playerId,
        eventId,
        status: "confirmed",
      };

      await eventsService.addEventRegistration(data);
    }

    return redirect(`/dashboard/events/${eventId}`);
  }
);

export default function AddPlayersToGroup() {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const { availablePlayers, playerGroups, event } =
    useLoaderData<typeof loader>();

  const toggleSelection = (playerId: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  return (
    <SheetPage
      backLink={`/dashboard/events/${event.id}`}
      title="Register Players for Event"
      description="Register Players for Event"
      updateButton="Add players to Event"
      hasForm
    >
      <>
        <Tabs defaultValue="players">
          <TabsList>
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="groups">Player Groups</TabsTrigger>
          </TabsList>
          <TabsContent value="players">
            <CardGrid
              name="All players are already registered"
              items={availablePlayers}
            >
              {availablePlayers?.map((player: Player) => (
                <PlayerCard
                  key={`available-player-card-${player.id}`}
                  player={player}
                  isSelected={selectedPlayers.includes(player.id)}
                  onSelect={toggleSelection}
                />
              ))}
            </CardGrid>
          </TabsContent>
          <TabsContent value="groups">
            <CardGrid
              name="All Groups are already registered"
              items={playerGroups}
            >
              {playerGroups.map((group: PlayerGroup) => (
                <GroupCard
                  group={group}
                  onSelect={toggleGroupSelection}
                  isSelected={selectedGroups.includes(group.id)}
                />
              ))}
            </CardGrid>
          </TabsContent>
        </Tabs>
        <input
          type="hidden"
          name="playerIds"
          value={JSON.stringify(selectedPlayers)}
        />
        <input
          type="hidden"
          name="groupIds"
          value={JSON.stringify(selectedGroups)}
        />
        <input type="hidden" name="eventId" value={event.id} />
      </>
    </SheetPage>
  );
}
