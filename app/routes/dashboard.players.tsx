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
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { CardGrid } from "~/components/ui/card-grid";
import { DropdownMenuItem } from "~/components/ui/dropdown-menu";
import { GroupService } from "~/services/groupService";
import { PlayerService } from "~/services/playerService";
import { ProgrammeService } from "~/services/programmeService";
import { ScoutService } from "~/services/scoutService";
import { cn } from "~/lib/utils";
import { Player } from "~/types";
import { withAuth } from "~/utils/auth-helpers";
import { calculateRelativeAgeQuartile } from "~/utils/helpers";
import { POSITION_GROUPS, findPositionGroup } from "~/utils/position-groups";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

// A player with no date of birth has no birth quartile.
// calculateRelativeAgeQuartile reports those as label "Q?" (its numeric
// `quartile` defaults to 1, which would silently bucket them with the oldest
// players), so the filter and the counts both key off the label.
const UNKNOWN = "Unknown";

const quartileOf = (player: Player) => {
  if (!player?.dateOfBirth) return UNKNOWN;
  const { label } = calculateRelativeAgeQuartile(player.dateOfBirth);
  return !label || label === "Q?" ? UNKNOWN : label;
};

// Q1…Q4 in order, Unknown last.
const quartileRank = (value: string) =>
  value === UNKNOWN ? 999 : Number(value.replace("Q", "")) || 500;

/**
 * How the squad splits across the school-year birth quartiles. Every quartile
 * is listed even when empty — a gap is the point of the summary, so a missing
 * Q4 has to read as "none" rather than quietly disappearing. Unknown only
 * appears when there are players to account for.
 */
type QuartileCount = { quartile: string; count: number };

const summariseQuartiles = (players: Player[]): QuartileCount[] => {
  const counts = new Map<string, number>([
    ["Q1", 0],
    ["Q2", 0],
    ["Q3", 0],
    ["Q4", 0],
  ]);
  for (const player of players) {
    const quartile = quartileOf(player);
    counts.set(quartile, (counts.get(quartile) || 0) + 1);
  }

  return [...counts.entries()]
    .sort(([a], [b]) => quartileRank(a) - quartileRank(b))
    .map(([quartile, count]) => ({ quartile, count }));
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
  const quartile = url.searchParams.get("quartile");

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
    const registeredPlayerIds = new Set(registrations.map((r) => r.playerId));
    filteredPlayers = filteredPlayers.filter(
      (p) => !registeredPlayerIds.has(p.id)
    );
  }

  // Birth quartile is derived from date of birth rather than stored, so it's
  // narrowed here rather than in the query. The counts are taken *before* that
  // narrowing so the summary keeps showing the whole spread — picking Q4 should
  // still show how many sit in Q1, not collapse to a single bar.
  const quartileSummary = summariseQuartiles(filteredPlayers);
  if (quartile) {
    filteredPlayers = filteredPlayers.filter((p) => quartileOf(p) === quartile);
  }

  return {
    players: filteredPlayers,
    quartileSummary,
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
      quartile,
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

// Same colours the player card uses for its quartile pill, so a badge here
// reads as the same thing as the badge on a card.
const QUARTILE_STYLES: Record<string, string> = {
  Q1: "bg-red-400 text-red",
  Q2: "bg-orange-400 text-orange",
  Q3: "bg-yellow-400 text-yellow",
  Q4: "bg-green-400 text-green",
};

const QUARTILE_MONTHS: Record<string, string> = {
  Q1: "Sept-Nov, oldest",
  Q2: "Dec-Feb",
  Q3: "Mar-May",
  Q4: "Jun-Aug, youngest",
};

export default function Players() {
  const {
    players,
    user,
    appliedFilters,
    groups,
    mentors,
    programmes,
    quartileSummary,
  } = useLoaderData<typeof loader>();

  // The summary is counted before the quartile filter is applied, so its total
  // is the size of the list with that one filter lifted.
  const summaryTotal = (quartileSummary as QuartileCount[]).reduce(
    (sum, q) => sum + q.count,
    0
  );

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

        {summaryTotal > 0 && (
          <Card className="border-border mt-6">
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-row flex-wrap gap-2 items-center justify-between">
                <h2 className="text-xl font-semibold text-white">
                  Relative Age Quartile
                </h2>
                <p className="text-sm text-muted">
                  {appliedFilters?.quartile
                    ? `Showing ${players.length} of ${summaryTotal} ${
                        appliedFilters.quartile === UNKNOWN
                          ? "with no date of birth"
                          : `born in ${appliedFilters.quartile}`
                      }`
                    : `Birth months across ${summaryTotal} ${
                        summaryTotal === 1 ? "player" : "players"
                      }`}
                </p>
              </div>
              <div className="flex flex-row flex-wrap gap-2">
                {(quartileSummary as QuartileCount[]).map(
                  ({ quartile, count }) => (
                    <Badge
                      key={`quartile-${quartile}`}
                      variant="outline"
                      className={cn(
                        "border-muted gap-2 py-1 text-sm font-normal",
                        appliedFilters?.quartile === quartile &&
                          "border-white bg-muted/20"
                      )}
                    >
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          QUARTILE_STYLES[quartile] ?? "bg-gray-500 text-white"
                        )}
                      >
                        {quartile === UNKNOWN ? "Q?" : quartile}
                      </span>
                      <span className="text-white">
                        {quartile === UNKNOWN
                          ? "No date of birth"
                          : QUARTILE_MONTHS[quartile]}
                      </span>
                      <span className="text-muted">
                        {count} ({Math.round((count / summaryTotal) * 100)}%)
                      </span>
                    </Badge>
                  )
                )}
              </div>
            </div>
          </Card>
        )}

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
