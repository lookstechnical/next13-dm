import type { MetaFunction } from "@remix-run/node";
import type { ShouldRevalidateFunctionArgs } from "@remix-run/react";
import { Form, Link, Outlet, useLoaderData, useSubmit } from "@remix-run/react";
import { UserPlus } from "lucide-react";
import { ActionProtection } from "~/components/action-protection";
import { SelectField } from "~/components/forms/select";
import { ListingHeader } from "~/components/layout/listing-header";
import { MoreActions } from "~/components/layout/more-actions";
import { PlayerFilters } from "~/components/players/filters";
import { PlayerCard } from "~/components/players/player-card";
import { AllowedRoles } from "~/components/route-protections";
import { Button } from "~/components/ui/button";
import { CardGrid } from "~/components/ui/card-grid";
import { DropdownMenuItem } from "~/components/ui/dropdown-menu";
import { GroupService } from "~/services/groupService";
import { PlayerService } from "~/services/playerService";
import { ScoutService } from "~/services/scoutService";
import { Player } from "~/types";
import { withAuth } from "~/utils/auth-helpers";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader = withAuth(async ({ request, user, supabaseClient }) => {
  const playerService = new PlayerService(supabaseClient);
  const groupService = new GroupService(supabaseClient);
  const scoutService = new ScoutService(supabaseClient);

  const url = new URL(request.url);
  const order = url.searchParams.get("order");
  const nameFilter = url.searchParams.get("name");
  const ageGroupFilter = url.searchParams.get("age-group");
  const mentor = url.searchParams.get("mentor");
  const position = url.searchParams.get("position");
  const group = url.searchParams.get("group") || user.team?.defaultGroup;

  const playersPromise = playerService.getPlayersByTeam(
    user.team?.id as string,
    order as string,
    nameFilter as string,
    ageGroupFilter as string,
    group as string,
    position as string
  );

  const groupsPromise = groupService.getGroupsByTeam(user.team?.id as string);

  const mentorPromise = scoutService.getAllScouts();

  const [players, groups, mentors] = await Promise.all([
    playersPromise,
    groupsPromise,
    mentorPromise,
  ]);

  const filteredByMentor = mentor
    ? players.filter((p) => p.mentor?.id === mentor)
    : players;

  return {
    players: filteredByMentor,
    mentors,
    user,
    groups,
    appliedFilters: {
      order,
      name: nameFilter,
      ageGroup: ageGroupFilter,
      group,
      position,
      mentor,
    },
  };
});

// Prevent revalidation when navigating to child player routes or when filters change
export function shouldRevalidate({
  currentUrl,
  nextUrl,
  formAction,
}: ShouldRevalidateFunctionArgs) {
  // Always revalidate after form submissions
  if (formAction) return true;

  // If just navigating to a player detail page, don't revalidate the list
  if (
    currentUrl.pathname === "/dashboard/players" &&
    nextUrl.pathname.startsWith("/dashboard/players/")
  ) {
    return false;
  }

  // If navigating back from player detail, revalidate to get fresh data
  if (
    currentUrl.pathname.startsWith("/dashboard/players/") &&
    nextUrl.pathname === "/dashboard/players"
  ) {
    return true;
  }

  // If search params changed (filters), use default behavior
  if (currentUrl.search !== nextUrl.search) {
    return true;
  }

  return false;
}

export default function Players() {
  const { players, user, appliedFilters, groups, mentors } =
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
          renderActions={() => (
            <div className="flex flex-row items-end justify-center gap-4 p-0 m-0">
              <PlayerFilters
                appliedFilters={appliedFilters}
                groups={groups}
                mentors={mentors}
              />
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
              <ActionProtection
                allowedRoles={AllowedRoles.headOfDept}
                user={user}
              >
                <MoreActions>
                  {/* <DropdownMenuItem asChild>
                  <Button asChild variant={"outline"}>
                    <Link to="/dashboard/players/csv-import">
                      <DownloadIcon />
                      Import CSV
                    </Link>
                  </Button>
                </DropdownMenuItem> */}
                  <DropdownMenuItem asChild>
                    <Button asChild variant={"outline"}>
                      <Link to="/dashboard/players/create">
                        <UserPlus />
                        Add Player
                      </Link>
                    </Button>
                  </DropdownMenuItem>
                </MoreActions>
              </ActionProtection>
            </div>
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
