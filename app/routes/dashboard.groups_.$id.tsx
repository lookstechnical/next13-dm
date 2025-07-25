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

  return { group };
};

export const action: ActionFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const groupsService = new GroupService(supabaseClient);

  let formData = await request.formData();
  const groupId = formData.get("groupId");
  const playerId = formData.get("playerId");

  if (playerId && groupId) {
    await groupsService.removePlayersFromGroup(groupId as string, [
      playerId as string,
    ]);
  }

  return { message: "Successfully removed" };
};

export default function PlayerPage() {
  const { group } = useLoaderData<typeof loader>();

  return (
    <>
      <div className="w-full flex flex-col gap-12 space-y-10 container px-4 mx-auto py-10 text-foreground">
        <div className="w-full flex flex-col md:flex-row gap-4 md:justify-between items-end md:items-center mb-6 ">
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <div className="bg-card min-h-screen py-10">
        <div className="container mx-auto px-4">
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

                  <Button
                    type="submit"
                    variant="outline"
                    className={cn("w-full text-white uppercase border-muted")}
                  >
                    Remove
                  </Button>
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
