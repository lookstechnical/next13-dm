import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { Link, Outlet, redirect, useLoaderData } from "@remix-run/react";
import {
  DownloadIcon,
  FilterIcon,
  MoreHorizontal,
  MoreVertical,
  User,
  UserPlus,
} from "lucide-react";
import { ListingHeader } from "~/components/layout/listing-header";
import { MoreActions } from "~/components/layout/more-actions";
import { PlayerCard } from "~/components/players/player-card";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { CardGrid } from "~/components/ui/card-grid";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { getSupabaseServerClient } from "~/lib/supabase";
import { PlayerService } from "~/services/playerService";
import { Player } from "~/types";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = async ({ request }) => {
  // const;
  const { supabaseClient } = getSupabaseServerClient(request);
  const authUser = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.user.id, supabaseClient);
  if (!user) {
    return redirect("/");
  }
  const playerService = new PlayerService(supabaseClient);
  const players =
    (await playerService.getPlayersByTeam(user?.current_team as string)) || [];
  return { players, user };
};

export default function Players() {
  const { players, user } = useLoaderData<typeof loader>();

  const cardUrl = (id: string) => {
    return `/dashboard/players/${id}`;
  };

  return (
    <div className="flex flex-column space-y-10 container px-4 mx-auto py-10 text-foreground">
      <div className="w-full">
        <ListingHeader
          title={`${user.team.name} Players`}
          searchPlaceholder="Search Players by Name"
          renderActions={() => (
            <MoreActions>
              <DropdownMenuItem asChild>
                <Button asChild variant={"outline"}>
                  <Link to="/dashboard/players/csv-import">
                    <DownloadIcon />
                    Import CSV
                  </Link>
                </Button>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Button asChild variant={"outline"}>
                  <Link to="/dashboard/players/create">
                    <UserPlus />
                    Add Player
                  </Link>
                </Button>
              </DropdownMenuItem>
            </MoreActions>
          )}
        />

        <CardGrid
          name={`${user.team.name} currently has 0 players`}
          items={players}
        >
          {players?.map((player: Player) => (
            <PlayerCard
              key={`player-card-${player.id}`}
              player={player}
              to={cardUrl}
            />
          ))}
        </CardGrid>

        <Outlet />
      </div>
    </div>
  );
}
