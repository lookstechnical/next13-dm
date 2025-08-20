import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import {
  Form,
  Link,
  Outlet,
  redirect,
  useLoaderData,
  useSubmit,
} from "@remix-run/react";
import { DownloadIcon, UserPlus } from "lucide-react";
import { SelectField } from "~/components/forms/select";
import { ListingHeader } from "~/components/layout/listing-header";
import { MoreActions } from "~/components/layout/more-actions";
import { PlayerFilters } from "~/components/players/filters";
import { PlayerCard } from "~/components/players/player-card";
import { Button } from "~/components/ui/button";
import { CardGrid } from "~/components/ui/card-grid";
import { DropdownMenuItem } from "~/components/ui/dropdown-menu";
import { getSupabaseServerClient } from "~/lib/supabase";
import { GroupService } from "~/services/groupService";
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
  const groupService = new GroupService(supabaseClient);

  const url = new URL(request.url);
  const order = url.searchParams.get("order");
  const nameFilter = url.searchParams.get("name");
  const ageGroupFilter = url.searchParams.get("age-group");
  const position = url.searchParams.get("position");
  const group = url.searchParams.get("group") || user.team?.defaultGroup;

  const players =
    (await playerService.getPlayersByTeam(
      user.team?.id as string,
      order as string,
      nameFilter as string,
      ageGroupFilter as string,
      group as string,
      position as string
    )) || [];

  const groups = await groupService.getGroupsByTeam(user.team?.id as string);

  return {
    players,
    user,
    groups,
    appliedFilters: {
      order,
      name: nameFilter,
      ageGroup: ageGroupFilter,
      group,
      position,
    },
  };
};

export default function Players() {
  const { players, user, appliedFilters, groups } =
    useLoaderData<typeof loader>();

  const submit = useSubmit();

  const cardUrl = (id: string) => {
    return `/dashboard/players/${id}`;
  };

  return (
    <div className="flex flex-column space-y-10 container px-4 mx-auto py-10 text-foreground">
      <div className="w-full">
        <ListingHeader
          title={`${user.team.name} Players`}
          renderFilters={() => (
            <div className="flex flex-row items-center justify-center gap-4">
              <PlayerFilters appliedFilters={appliedFilters} groups={groups} />
              <Form
                onChange={(event) => {
                  submit(event.currentTarget);
                }}
              >
                <SelectField
                  name="order"
                  label=""
                  placeholder="Order By"
                  options={[
                    { id: "name", name: "Name" },
                    { id: "date_of_birth", name: "Age" },
                  ]}
                />
              </Form>
            </div>
          )}
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
