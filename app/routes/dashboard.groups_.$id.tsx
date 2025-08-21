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
  Users2Icon,
} from "lucide-react";
import { DownloadButton } from "~/components/groups/teamsheet-buttton";
import { ListingHeader } from "~/components/layout/listing-header";
import { PlayerFilters } from "~/components/players/filters";
import { PlayerCard } from "~/components/players/player-card";
import ActionButton from "~/components/ui/action-button";
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
import { PlayerService } from "~/services/playerService";
import { EventRegistration, Player } from "~/types";
import {
  calculateAgeGroup,
  calculateRelativeAgeQuartile,
  formatDate,
} from "~/utils/helpers";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const eventService = new GroupService(supabaseClient);
  const group = await eventService.getGroupById(params.id as string);

  const url = new URL(request.url);
  // const order = url.searchParams.get("order");
  const nameFilter = url.searchParams.get("name");
  const ageGroup = url.searchParams.get("age-group");

  const playerGroupMembers = group?.playerGroupMembers.filter((pg) => {
    const val = true;
    if (nameFilter) {
      const name = pg.players.name;
      if (name && name.toLowerCase().includes(nameFilter)) {
      } else return false;
    }

    if (ageGroup) {
      const ag = calculateAgeGroup(pg.players.dateOfBirth);
      if (ageGroup && ageGroup === ag) {
      } else {
        return false;
      }
    }

    return val;
  });

  return { group: { ...group, playerGroupMembers } };
};

export const action: ActionFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
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
};

export default function PlayerPage() {
  const { group } = useLoaderData<typeof loader>();

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
                    players={group.playerGroupMembers.map(
                      (p: any) => p.players
                    )}
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
          <ListingHeader
            title={`${group.name} Players`}
            renderFilters={() => (
              <div className="flex flex-row items-center justify-center gap-4">
                <PlayerFilters />
              </div>
            )}
          />

          <CardGrid items={group.playerGroupMembers} name="Players">
            {group.playerGroupMembers.map((player: any) => (
              <PlayerCard
                key={`group-player-${player.players.id}`}
                player={player.players}
              >
                <Form method="delete">
                  <input
                    type="hidden"
                    name="playerId"
                    value={player.players.id}
                  />
                  <input type="hidden" name="groupId" value={group.id} />

                  <ActionButton
                    className={cn("w-full text-white uppercase border-muted")}
                    title="Remove"
                  />
                </Form>
              </PlayerCard>
            ))}
          </CardGrid>
          <Outlet />
        </div>
      </div>
    </>
  );
}
