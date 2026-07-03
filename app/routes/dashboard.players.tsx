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
import { ProgrammeService } from "~/services/programmeService";
import { ScoutService } from "~/services/scoutService";
import { Player } from "~/types";
import { withAuth } from "~/utils/auth-helpers";
import { POSITION_GROUPS, findPositionGroup } from "~/utils/position-groups";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader = withAuth(async ({ request, user, supabaseClient }) => {
  const playerService = new PlayerService(supabaseClient);
  const groupService = new GroupService(supabaseClient);
  const scoutService = new ScoutService(supabaseClient);
  const programmeService = new ProgrammeService(supabaseClient);

  const url = new URL(request.url);
  const order = url.searchParams.get("order");
  const nameFilter = url.searchParams.get("name");
  const ageGroupFilter = url.searchParams.get("age-group");
  const mentor = url.searchParams.get("mentor");
  const position = url.searchParams.get("position");
  const group = url.searchParams.get("group") || user.team?.defaultGroup;
  const groupBy = url.searchParams.get("groupBy") ?? "position_group";
  const notInProgramme = url.searchParams.get("not-in-programme");

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

  const programmesPromise = programmeService.getProgrammesByTeam(
    user.team?.id as string
  );

  const [players, groups, mentors, programmes] = await Promise.all([
    playersPromise,
    groupsPromise,
    mentorPromise,
    programmesPromise,
  ]);

  const filteredByMentor = mentor
    ? players.filter((p) => p.mentor?.id === mentor)
    : players;

  // Exclude players already registered on the selected programme.
  let filteredPlayers = filteredByMentor;
  if (notInProgramme) {
    const registrations = await programmeService.getProgrammeRegistrations(
      notInProgramme
    );
    const registeredPlayerIds = new Set(
      registrations.map((r) => r.playerId)
    );
    filteredPlayers = filteredPlayers.filter(
      (p) => !registeredPlayerIds.has(p.id)
    );
  }

  return {
    players: filteredPlayers,
    mentors,
    user,
    groups,
    programmes,
    appliedFilters: {
      order,
      name: nameFilter,
      ageGroup: ageGroupFilter,
      group,
      position,
      mentor,
      groupBy,
      notInProgramme,
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
  const { players, user, appliedFilters, groups, mentors, programmes } =
    useLoaderData<typeof loader>();

  const submit = useSubmit();

  const cardUrl = (id: string) => {
    return `/dashboard/players/${id}`;
  };

  const groupedPlayers =
    appliedFilters?.groupBy === "position_group"
      ? (() => {
          const buckets = new Map<string, Player[]>();
          for (const g of POSITION_GROUPS) buckets.set(g.label, []);
          const other: Player[] = [];
          for (const p of players as Player[]) {
            const pg = findPositionGroup(p.position);
            if (pg) buckets.get(pg.label)!.push(p);
            else other.push(p);
          }
          const sections = POSITION_GROUPS.map((g) => ({
            label: g.label,
            players: buckets.get(g.label) ?? [],
          })).filter((s) => s.players.length > 0);
          if (other.length > 0)
            sections.push({ label: "Other", players: other });
          return sections;
        })()
      : null;

  return (
    <div className="flex flex-column space-y-10 container px-4 mx-auto py-10 text-foreground">
      <div className="w-full">
        <ListingHeader
          title={`${user.team.name} Players (${players.length})`}
          renderActions={() => (
            <div className="flex flex-row items-end justify-center gap-4 p-0 m-0">
              <PlayerFilters
                appliedFilters={appliedFilters}
                groups={groups}
                mentors={mentors}
                programmes={programmes}
              />
              <Form
                onChange={(event) => {
                  submit(event.currentTarget);
                }}
              >
                <SelectField
                  name="groupBy"
                  label=""
                  placeholder="Group By"
                  defaultValue={appliedFilters?.groupBy ?? "position_group"}
                  options={[
                    { id: "position_group", name: "Position Group" },
                    { id: "none", name: "None" },
                  ]}
                />
              </Form>
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

        {groupedPlayers ? (
          players.length === 0 ? (
            <CardGrid
              name={`${user.team.name} currently has 0 players`}
              items={players}
            >
              {null}
            </CardGrid>
          ) : (
            <div className="flex flex-col gap-8 py-10">
              {groupedPlayers.map((section) => (
                <div key={section.label}>
                  <div className="flex items-baseline gap-3 mb-4">
                    <h2 className="text-lg font-semibold text-white">
                      {section.label}
                    </h2>
                    <span className="text-sm text-muted">
                      {section.players.length}
                    </span>
                  </div>
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {section.players.map((player) => (
                      <PlayerCard
                        key={`player-card-${player.id}`}
                        player={player}
                        to={cardUrl}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
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
        )}

        <Outlet />
      </div>
    </div>
  );
}
