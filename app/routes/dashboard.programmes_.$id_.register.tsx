import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { Form, Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { Printer, Download, Plus, RotateCcw, Shirt, X } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { AllowedRoles } from "~/components/route-protections";
import { GroupService } from "~/services/groupService";
import { ProgrammeService } from "~/services/programmeService";
import { TeamService } from "~/services/teamService";
import type {
  PlayerGroup,
  ProgrammeEvent,
  ProgrammeEventAvailability,
  ProgrammeRegistration,
  Team,
} from "~/types";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";
import { calculateAgeGroup, eventTimeRange, formatDate } from "~/utils/helpers";
import { POSITION_GROUPS } from "~/utils/position-groups";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [
    { title: "Register" },
    { name: "description", content: "Printable register for a programme date" },
  ];
};

export const loader: LoaderFunction = withAuth(
  async ({ params, supabaseClient, user }) => {
    const programmeService = new ProgrammeService(supabaseClient);
    const groupService = new GroupService(supabaseClient);
    const teamService = new TeamService(supabaseClient);

    const programme = await programmeService.getProgrammeById(
      params.id as string
    );
    const programmeEvents = await programmeService.getProgrammeEvents(
      params.id as string
    );
    const registrations = await programmeService.getProgrammeRegistrations(
      params.id as string
    );
    const availability = await programmeService.getProgrammeEventAvailability(
      params.id as string
    );
    const playerGroups = await groupService.getGroupsByTeam(
      user.current_team as string
    );
    // getTeamById hands the row back as Postgres stores it, so this one column
    // arrives snake_case where the rest of the page is camelCase.
    const team = (await teamService.getTeamById(
      user.current_team as string
    )) as
      | (Team & {
          missing_bib_numbers?: Record<string, number[]>;
          highest_bib_numbers?: Record<string, number>;
        })
      | null;

    // Two columns on the team, one view for the page: what each set is missing
    // and where it stops. Colours with nothing recorded are left out, so the
    // register can read "absent" as "complete and uncounted".
    const bibSets: Record<string, BibSet> = {};
    for (const color of BIB_COLORS) {
      const missing = team?.missing_bib_numbers?.[color.id] ?? [];
      const highest = team?.highest_bib_numbers?.[color.id];
      if (missing.length > 0 || highest) {
        bibSets[color.id] = { missing, highest };
      }
    }

    return {
      programme,
      programmeEvents,
      registrations,
      availability,
      playerGroups,
      bibSets,
    };
  }
);

/**
 * Records what each bib set holds — the numbers it has lost and the number it
 * stops at. Every colour is submitted together, so the form is the whole
 * picture: a colour left blank has nothing to record.
 */
export const action: ActionFunction = withAuthAction(
  AllowedRoles.coach,
  async ({ request, user, supabaseClient }) => {
    const formData = await request.formData();
    const teamService = new TeamService(supabaseClient);

    const missing: Record<string, number[]> = {};
    const highest: Record<string, number> = {};
    for (const color of BIB_COLORS) {
      const numbers = parseNumberList(
        String(formData.get(`missing-${color.id}`) ?? "")
      );
      if (numbers.length > 0) missing[color.id] = numbers;

      const last = Number(
        String(formData.get(`highest-${color.id}`) ?? "").trim()
      );
      if (Number.isInteger(last) && last > 0) highest[color.id] = last;
    }

    await teamService.setBibSets(user.current_team as string, {
      missing,
      highest,
    });

    return { ok: true };
  }
);

const ALL_GROUPS = "__all__";

/** Blank rows printed after the squad so walk-ups can be written in by hand. */
const BLANK_ROWS = 10;

/**
 * Squad-wide groups every registered player belongs to. Naming them in the
 * Group column tells a coach nothing, and hides the group that does.
 */
const IMPLIED_GROUP_NAMES = ["excel", "excel squad"];

const isImpliedGroup = (name: string) =>
  IMPLIED_GROUP_NAMES.includes(name.trim().toLowerCase());

/** Players who belong to no named group still need a section to sit in. */
const UNGROUPED_KEY = "__ungrouped__";
/** Select value meaning "leave this player to the automatic split". */
const AUTO_PLACEMENT = "auto";
const UNGROUPED_NAME = "No group";

type BibColor = { id: string; name: string; bg: string; fg: string };

/**
 * Bib colours a club is likely to own, with the text colour that stays legible
 * on each. Both are carried as hex rather than Tailwind classes because the
 * printed sheet sets them as inline custom properties — see PRINT_CSS.
 */
const BIB_COLORS: BibColor[] = [
  { id: "red", name: "Red", bg: "#dc2626", fg: "#ffffff" },
  { id: "blue", name: "Blue", bg: "#2563eb", fg: "#ffffff" },
  { id: "yellow", name: "Yellow", bg: "#facc15", fg: "#111827" },
  { id: "green", name: "Green", bg: "#16a34a", fg: "#ffffff" },
  { id: "orange", name: "Orange", bg: "#ea580c", fg: "#ffffff" },
  { id: "purple", name: "Purple", bg: "#7c3aed", fg: "#ffffff" },
  { id: "pink", name: "Pink", bg: "#db2777", fg: "#ffffff" },
  { id: "black", name: "Black", bg: "#111827", fg: "#ffffff" },
  { id: "white", name: "White", bg: "#f9fafb", fg: "#111827" },
];

const colorById = (id: string) =>
  BIB_COLORS.find((c) => c.id === id) ?? BIB_COLORS[0];

/**
 * Groups run alongside each other on the same pitch, so each one is handed a
 * different pair of colours by default — two groups both in red/blue makes the
 * bibs useless for telling teams apart. The palette has an odd length, so
 * walking it two at a time never repeats a pair until it has been all the way
 * round.
 */
const defaultColorPair = (index: number): [string, string] => [
  BIB_COLORS[(index * 2) % BIB_COLORS.length].id,
  BIB_COLORS[(index * 2 + 1) % BIB_COLORS.length].id,
];

/**
 * Colour choices ride in the URL (`bibColors=<groupId>:red-blue-yellow,...`) so
 * a printed sheet and a shared link show the same teams. The first two are the
 * two teams; anything after is a spare, used in order when a set hasn't the
 * bibs to cover a team. Only groups that have been changed are stored; the rest
 * fall back to the default pair.
 */
const parseColorOverrides = (value: string | null): Map<string, string[]> => {
  const map = new Map<string, string[]>();
  if (!value) return map;
  for (const entry of value.split(",")) {
    const [key, list] = entry.split(":");
    const ids = (list ?? "")
      .split("-")
      .filter((id) => BIB_COLORS.some((c) => c.id === id));
    if (key && ids.length >= 2) map.set(key, ids);
  }
  return map;
};

const serialiseColorOverrides = (map: Map<string, string[]>) =>
  [...map.entries()].map(([key, ids]) => `${key}:${ids.join("-")}`).join(",");

/** How many of a group's colours are teams; the rest are spares. */
const TEAM_COUNT = 2;

/**
 * Where a coach has moved a player, against the automatic split. Rides in the
 * URL as `moves=<registrationId>:<groupKey>:<team>` so a reshuffled sheet
 * prints and shares exactly as it looks on screen. `team` is "x" when only the
 * group was chosen — moving someone between groups shouldn't pin them to a
 * half they were never put in.
 */
type PlayerMove = { groupKey: string; team?: 0 | 1 };

const parseMoves = (value: string | null): Map<string, PlayerMove> => {
  const map = new Map<string, PlayerMove>();
  if (!value) return map;
  for (const entry of value.split(",")) {
    const [id, groupKey, team] = entry.split(":");
    if (!id || !groupKey) continue;
    map.set(id, {
      groupKey,
      team: team === "0" ? 0 : team === "1" ? 1 : undefined,
    });
  }
  return map;
};

const serialiseMoves = (map: Map<string, PlayerMove>) =>
  [...map.entries()]
    .map(([id, m]) => `${id}:${m.groupKey}:${m.team ?? "x"}`)
    .join(",");

/**
 * What a club's bib set of one colour holds: the numbers it has lost, and the
 * number it stops at. An absent `highest` means nobody has counted the bag, so
 * the register treats that set as bottomless — which is how it behaved before
 * any of this existed.
 */
type BibSet = { missing?: number[]; highest?: number };

/**
 * "3, 7 11" → [3, 7, 11]. These get typed off the top of someone's head while
 * they look in the bag, so anything that isn't a positive whole number is
 * dropped rather than argued with, and the result is deduped and sorted so the
 * field reads back tidily.
 */
const parseNumberList = (value: string): number[] =>
  [
    ...new Set(
      value
        .split(/[^0-9]+/)
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0)
    ),
  ].sort((a, b) => a - b);

/**
 * Bib numbers set by hand, as `bibNumbers=<registrationId>:<number>`. Sets go
 * missing numbers over a season, so a coach has to be able to put a player in
 * whatever bib actually exists.
 */
const parseBibOverrides = (value: string | null): Map<string, number> => {
  const map = new Map<string, number>();
  if (!value) return map;
  for (const entry of value.split(",")) {
    const [id, number] = entry.split(":");
    const parsed = Number(number);
    if (id && Number.isInteger(parsed) && parsed > 0) map.set(id, parsed);
  }
  return map;
};

const serialiseBibOverrides = (map: Map<string, number>) =>
  [...map.entries()].map(([id, number]) => `${id}:${number}`).join(",");

/** Position order used to shape the two teams; unknown positions sort last. */
const positionRank = (position: string) => {
  const index = POSITION_GROUPS.findIndex((g) =>
    g.positions.includes(position)
  );
  return index === -1 ? POSITION_GROUPS.length : index;
};

const byPosition = <T extends { name: string; position: string }>(a: T, b: T) =>
  positionRank(a.position) - positionRank(b.position) ||
  a.name.localeCompare(b.name);

/**
 * Deal a group into two teams so both sides come out with the same shape, not
 * just the same size: each player joins whichever team is shorter of their own
 * position group (middles, outside backs, halves, hookers, fullbacks, back
 * row), with overall size as the tie-break. Balancing on size alone would
 * happily stack every prop on one team.
 *
 * Anyone a coach has placed by hand is seated first and the rest fill in around
 * them, so a manual move pulls the split back level rather than leaving it
 * lopsided.
 */
function splitIntoTeams<T extends { name: string; position: string }>(
  players: T[],
  forcedTeam: (player: T) => 0 | 1 | undefined = () => undefined
): [T[], T[]] {
  const teams: [T[], T[]] = [[], []];
  const unplaced: T[] = [];

  for (const player of players) {
    const forced = forcedTeam(player);
    if (forced === undefined) unplaced.push(player);
    else teams[forced].push(player);
  }

  // Position-group headcount per team, seeded with whoever was placed by hand.
  const shape: [Map<number, number>, Map<number, number>] = [
    new Map(),
    new Map(),
  ];
  const bump = (team: 0 | 1, rank: number) =>
    shape[team].set(rank, (shape[team].get(rank) ?? 0) + 1);
  teams.forEach((team, i) =>
    team.forEach((p) => bump(i as 0 | 1, positionRank(p.position)))
  );

  for (const player of [...unplaced].sort(byPosition)) {
    const rank = positionRank(player.position);
    const inA = shape[0].get(rank) ?? 0;
    const inB = shape[1].get(rank) ?? 0;
    const target: 0 | 1 =
      inA !== inB
        ? inA < inB
          ? 0
          : 1
        : teams[0].length <= teams[1].length
        ? 0
        : 1;
    teams[target].push(player);
    bump(target, rank);
  }

  return [teams[0].sort(byPosition), teams[1].sort(byPosition)];
}

/**
 * A bib, drawn as the colour it is. The colours are also written to custom
 * properties so PRINT_CSS can let them through the sheet's otherwise
 * colour-stripping print rules.
 */
const BibChip = ({
  color,
  label,
  className,
}: {
  color: BibColor;
  label?: string;
  className?: string;
}) => (
  <span
    className={cn(
      "bib-chip inline-flex items-center justify-center min-w-[1.75rem] h-6 px-1.5 rounded border border-border text-xs font-semibold",
      className
    )}
    style={
      {
        "--bib-bg": color.bg,
        "--bib-fg": color.fg,
        background: color.bg,
        color: color.fg,
      } as CSSProperties
    }
  >
    {label ?? ""}
  </span>
);

/** Escape a value for a CSV cell (quote when it contains a comma/quote/newline). */
const csvCell = (value: string) => {
  const s = value ?? "";
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Turn a string into a safe filename fragment. */
const slugify = (value: string) =>
  value
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "register";

/**
 * The event a coach most likely wants a register for: the next one still to
 * come, falling back to the most recent past event when the programme is over.
 */
function defaultEventId(programmeEvents: ProgrammeEvent[]): string | undefined {
  const dated = programmeEvents
    .filter((pe) => pe.events?.date)
    .sort((a, b) => (a.events!.date < b.events!.date ? -1 : 1));
  if (dated.length === 0) return programmeEvents[0]?.eventId;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const upcoming = dated.find(
    (pe) => new Date(pe.events!.date).getTime() >= todayStart.getTime()
  );
  return (upcoming ?? dated[dated.length - 1]).eventId;
}

const PRINT_CSS = `
@media print {
  @page { size: A4 portrait; margin: 12mm; }
  header, .no-print { display: none !important; }
  html, body { background: #fff !important; }
  .register-sheet, .register-sheet * {
    background: transparent !important;
    color: #000 !important;
    border-color: #999 !important;
  }
  .register-sheet table { page-break-inside: auto; }
  .register-sheet tr { page-break-inside: avoid; page-break-after: auto; }
  .register-sheet thead { display: table-header-group; }
  .register-sheet .register-section { page-break-inside: auto; }
  /* The rule above strips every background so the sheet prints cleanly; the
     bib chips are the one thing whose colour carries meaning, so they opt back
     in. Printers that drop background graphics still get the colour name in
     text beside the number. */
  .register-sheet .bib-chip {
    background: var(--bib-bg) !important;
    color: var(--bib-fg) !important;
    border: 1px solid #333 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
`;

export default function ProgrammeRegister() {
  const {
    programme,
    programmeEvents,
    registrations,
    availability,
    playerGroups,
    bibSets,
  } = useLoaderData<{
    programme: { id: string; name: string };
    programmeEvents: ProgrammeEvent[];
    registrations: ProgrammeRegistration[];
    availability: ProgrammeEventAvailability[];
    playerGroups: PlayerGroup[];
    bibSets: Record<string, BibSet>;
  }>();

  const [searchParams, setSearchParams] = useSearchParams();

  const selectedEventId =
    searchParams.get("eventId") ?? defaultEventId(programmeEvents) ?? "";
  const groupFilter = searchParams.get("group") ?? ALL_GROUPS;
  // Bibs are the point of the sheet now, so they start on and are switched off
  // explicitly rather than the other way round.
  const bibsEnabled = searchParams.get("bibs") !== "0";
  const colorOverrides = useMemo(
    () => parseColorOverrides(searchParams.get("bibColors")),
    [searchParams]
  );
  const moves = useMemo(
    () => parseMoves(searchParams.get("moves")),
    [searchParams]
  );
  const bibOverrides = useMemo(
    () => parseBibOverrides(searchParams.get("bibNumbers")),
    [searchParams]
  );

  const selectedEvent = programmeEvents.find(
    (pe) => pe.eventId === selectedEventId
  );

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next, { replace: true, preventScrollReset: true });
  };

  // A group's colours are stored as one list — the two teams then any spares —
  // so changing one slot writes the whole list back.
  const setGroupColors = (groupKey: string, colors: string[]) => {
    const next = new Map(colorOverrides);
    next.set(groupKey, colors);
    setParam("bibColors", serialiseColorOverrides(next));
  };

  const setColorAt = (
    groupKey: string,
    index: number,
    colorId: string,
    current: string[]
  ) => {
    const colors = [...current];
    colors[index] = colorId;
    setGroupColors(groupKey, colors);
  };

  // A spare only earns its place when a set can't cover a team, so the first
  // colour not already used by this group is the useful suggestion.
  const addSpareColor = (groupKey: string, current: string[]) => {
    const unused = BIB_COLORS.find((c) => !current.includes(c.id));
    if (!unused) return;
    setGroupColors(groupKey, [...current, unused.id]);
  };

  const removeColorAt = (groupKey: string, index: number, current: string[]) =>
    setGroupColors(
      groupKey,
      current.filter((_, i) => i !== index)
    );

  // "auto" hands a player back to the automatic split; anything else is a
  // group (and, when the split is on, a team) chosen by hand.
  const setMove = (registrationId: string, value: string) => {
    const next = new Map(moves);
    if (value === AUTO_PLACEMENT) {
      next.delete(registrationId);
    } else {
      const [groupKey, team] = value.split(":");
      next.set(registrationId, {
        groupKey,
        team: team === "0" ? 0 : team === "1" ? 1 : undefined,
      });
    }
    setParam("moves", serialiseMoves(next));
  };

  const clearMoves = () => setParam("moves", "");

  // Blank hands the player back to the automatic numbering; anything else is
  // the bib they've actually been given.
  const setBibNumber = (registrationId: string, value: string) => {
    const next = new Map(bibOverrides);
    const parsed = Number(value.trim());
    if (!value.trim() || !Number.isInteger(parsed) || parsed < 1) {
      next.delete(registrationId);
    } else {
      next.set(registrationId, parsed);
    }
    setParam("bibNumbers", serialiseBibOverrides(next));
  };

  const clearBibNumbers = () => setParam("bibNumbers", "");

  // Which bib is open for editing. The chip is the control, so only one is ever
  // an input at a time.
  const [editingBib, setEditingBib] = useState<string | null>(null);
  const [bibSetsOpen, setBibSetsOpen] = useState(false);

  const playerIdToGroupNames = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const g of playerGroups ?? []) {
      if (isImpliedGroup(g.name)) continue;
      for (const pid of g.playerIds ?? []) {
        const list = map.get(pid) ?? [];
        list.push(g.name);
        map.set(pid, list);
      }
    }
    return map;
  }, [playerGroups]);

  const availabilityByRegistration = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const a of availability) {
      if (a.eventId === selectedEventId) {
        map.set(a.programmeRegistrationId, a.available);
      }
    }
    return map;
  }, [availability, selectedEventId]);

  const namedGroups = useMemo(
    () => (playerGroups ?? []).filter((g) => !isImpliedGroup(g.name)),
    [playerGroups]
  );

  // The group a player is registered *under* for this session. Someone can sit
  // in several squads at once, so the first named group they belong to wins —
  // the service hands groups back in name order, which keeps the choice stable
  // between reloads and between coaches.
  const playerIdToPrimaryGroup = useMemo(() => {
    const map = new Map<string, { key: string; name: string }>();
    for (const g of namedGroups) {
      for (const pid of g.playerIds ?? []) {
        if (!map.has(pid)) map.set(pid, { key: g.id, name: g.name });
      }
    }
    return map;
  }, [namedGroups]);

  // Default colours are keyed off a group's place in the full squad list, not
  // its place on screen, so a group keeps the same pair whether it is printed
  // on its own or alongside every other group.
  const groupOrderIndex = useMemo(() => {
    const map = new Map<string, number>();
    namedGroups.forEach((g, i) => map.set(g.id, i));
    map.set(UNGROUPED_KEY, namedGroups.length);
    return map;
  }, [namedGroups]);

  const rows = useMemo(() => {
    // Filtering to one group makes that group the section every row sits in,
    // even for a player who also belongs to an earlier-named squad — the sheet
    // is for the group that was asked for.
    const filteredGroup =
      groupFilter === ALL_GROUPS
        ? undefined
        : playerGroups?.find((g) => g.id === groupFilter);

    return registrations
      .filter((reg) => {
        if (!filteredGroup) return true;
        return !!filteredGroup.playerIds?.includes(reg.players?.id ?? "");
      })
      .map((reg) => {
        const available = availabilityByRegistration.get(reg.id);
        const playerId = reg.players?.id ?? "";
        const primary = filteredGroup
          ? { key: filteredGroup.id, name: filteredGroup.name }
          : playerIdToPrimaryGroup.get(playerId);
        return {
          id: reg.id,
          name: reg.players?.name ?? "Unknown",
          position: reg.players?.position ?? "",
          ageGroup: reg.players?.dateOfBirth
            ? calculateAgeGroup(reg.players.dateOfBirth)
            : "Unknown",
          club: reg.players?.club || "-",
          groups: playerIdToGroupNames.get(playerId) ?? [],
          groupKey: primary?.key ?? UNGROUPED_KEY,
          groupName: primary?.name ?? UNGROUPED_NAME,
          available,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [
    registrations,
    groupFilter,
    playerGroups,
    playerIdToGroupNames,
    playerIdToPrimaryGroup,
    availabilityByRegistration,
  ]);

  /**
   * The register, split by group and then into the two teams each group will
   * play in. Anyone who has said they aren't coming is left out of the split
   * and listed under the group instead — dealing them a bib would leave the two
   * sides uneven on the day.
   */
  const sections = useMemo(() => {
    // Keyed off the squad list rather than off the members, because a section
    // can be made up entirely of players moved in from elsewhere — their own
    // groupName would then mislabel the section they've been moved to.
    const groupNames = new Map(namedGroups.map((g) => [g.id, g.name]));
    const sectionKeys = new Set([...groupNames.keys(), UNGROUPED_KEY]);

    const byGroup = new Map<string, typeof rows>();
    for (const row of rows) {
      // A move to a group that is no longer on the sheet (it was renamed, or
      // the player left it) falls back to where the player would sit anyway.
      const moved = moves.get(row.id);
      const key =
        moved && sectionKeys.has(moved.groupKey)
          ? moved.groupKey
          : row.groupKey;
      const list = byGroup.get(key) ?? [];
      list.push(row);
      byGroup.set(key, list);
    }

    // Named groups in the order the service returned them, then the ungrouped
    // catch-all last.
    const orderedKeys = [
      ...namedGroups.map((g) => g.id).filter((id) => byGroup.has(id)),
      ...(byGroup.has(UNGROUPED_KEY) ? [UNGROUPED_KEY] : []),
    ];

    // Placing someone by hand says they're playing, whatever they answered — a
    // coach reaching for the control is usually looking at the player.
    const placedByHand = (row: (typeof rows)[number]) =>
      moves.get(row.id)?.team;

    // First pass: who is in which group, which half, and what colour that half
    // wears. Numbering has to wait until every hand-set bib is known.
    const built = orderedKeys.map((key) => {
      const members = byGroup.get(key) ?? [];
      const playing = members.filter(
        (r) => r.available !== false || placedByHand(r) !== undefined
      );
      const unavailable = members.filter(
        (r) => r.available === false && placedByHand(r) === undefined
      );
      const [teamA, teamB] = splitIntoTeams(playing, placedByHand);

      return {
        key,
        name: groupNames.get(key) ?? UNGROUPED_NAME,
        members,
        unavailable,
        colors:
          colorOverrides.get(key) ??
          defaultColorPair(groupOrderIndex.get(key) ?? 0),
        rosters: [teamA, teamB],
      };
    });

    // Every number claimed by hand, counted per colour. Claims are counted
    // against the colour the group has chosen for that team; if the team ends
    // up in a spare colour the claim travels with it, which is what a coach
    // means by "he's wearing 12".
    const claimedByColor = new Map<string, Map<number, number>>();
    for (const section of built) {
      section.rosters.forEach((roster, teamIndex) => {
        const colorId = section.colors[teamIndex];
        for (const player of roster) {
          const override = bibOverrides.get(player.id);
          if (override === undefined) continue;
          const claimed =
            claimedByColor.get(colorId) ?? new Map<number, number>();
          claimed.set(override, (claimed.get(override) ?? 0) + 1);
          claimedByColor.set(colorId, claimed);
        }
      });
    }

    // Bibs are dealt per colour across the whole sheet rather than per team —
    // two groups both wearing red would otherwise each field a Red 3. The
    // second red team carries on where the first stopped.
    const nextBibByColor = new Map<string, number>();
    const colorsInUse = new Set<string>();

    const setOf = (colorId: string) => bibSets[colorId] ?? {};
    const missingIn = (colorId: string) =>
      new Set(setOf(colorId).missing ?? []);

    /**
     * How many bibs of a colour are still to be handed out: what's left between
     * the next number and the end of the set, less the ones gone missing and
     * the ones already claimed by hand. A set with no last number recorded is
     * treated as bottomless, which is how the sheet behaved before anyone
     * counted the bag.
     */
    const capacity = (colorId: string) => {
      const highest = setOf(colorId).highest;
      if (!highest) return Number.POSITIVE_INFINITY;
      const missing = missingIn(colorId);
      const claimed = claimedByColor.get(colorId) ?? new Map<number, number>();
      let count = 0;
      for (let n = nextBibByColor.get(colorId) ?? 1; n <= highest; n += 1) {
        if (!missing.has(n) && !claimed.has(n)) count += 1;
      }
      return count;
    };

    /**
     * The colour a team actually wears. Its own colour if that set can still
     * cover it, otherwise the group's spares in the order they were listed. If
     * none of them fit, any colour not already on the sheet is better than
     * sending players out without a bib — and if even that fails the team wears
     * whichever of its own colours goes furthest and the shortfall is flagged.
     */
    const chooseColor = (
      preferred: string[],
      needed: number,
      blocked: Set<string>
    ) => {
      const options = preferred.filter((id) => !blocked.has(id));
      const fits = options.find((id) => capacity(id) >= needed);
      if (fits) return { id: fits, rescued: false, short: false };

      const rescue = BIB_COLORS.map((c) => c.id).find(
        (id) =>
          !blocked.has(id) && !colorsInUse.has(id) && capacity(id) >= needed
      );
      if (rescue) return { id: rescue, rescued: true, short: false };

      const best = options.reduce(
        (a, b) => (capacity(b) > capacity(a) ? b : a),
        options[0] ?? preferred[0]
      );
      return { id: best, rescued: false, short: true };
    };

    return built.map((section) => {
      const teamColors: string[] = [];

      const teams = section.rosters.map((roster, teamIndex) => {
        // Players holding a hand-set number don't need one dealing to them.
        const needed = roster.filter(
          (p) => bibOverrides.get(p.id) === undefined
        ).length;
        const chosen = section.colors[teamIndex];
        const spares = section.colors.slice(TEAM_COUNT);
        const picked = chooseColor(
          [chosen, ...spares],
          needed,
          new Set(teamColors)
        );

        const color = colorById(picked.id);
        teamColors.push(color.id);
        colorsInUse.add(color.id);

        const claimed = claimedByColor.get(chosen) ?? new Map<number, number>();
        const missing = missingIn(color.id);
        const highest = setOf(color.id).highest;
        let next = nextBibByColor.get(color.id) ?? 1;

        const players = roster.map((player) => {
          const override = bibOverrides.get(player.id);
          if (override !== undefined) {
            return {
              ...player,
              bib: override as number | null,
              bibSetByHand: true,
              bibIssue: ((claimed.get(override) ?? 0) > 1
                ? "clash"
                : highest && override > highest
                ? "outOfSet"
                : null) as "clash" | "outOfSet" | null,
            };
          }

          while (claimed.has(next) || missing.has(next)) next += 1;
          // The set has run out. Better an empty box on the sheet than a number
          // nobody can find a bib for.
          if (highest && next > highest) {
            return {
              ...player,
              bib: null as number | null,
              bibSetByHand: false,
              bibIssue: null as "clash" | "outOfSet" | null,
            };
          }

          const bib = next;
          next += 1;
          return {
            ...player,
            bib: bib as number | null,
            bibSetByHand: false,
            bibIssue: null as "clash" | "outOfSet" | null,
          };
        });

        nextBibByColor.set(color.id, next);
        const numbers = players
          .map((p) => p.bib)
          .filter((n): n is number => n !== null);

        return {
          color,
          players,
          missing: setOf(color.id).missing ?? [],
          highest,
          // The set the group asked for couldn't cover this team.
          wearingSpare: color.id !== chosen,
          rescued: picked.rescued,
          shortfall: players.filter((p) => p.bib === null).length,
          firstBib: numbers.length > 0 ? Math.min(...numbers) : 0,
          lastBib: numbers.length > 0 ? Math.max(...numbers) : 0,
        };
      });

      return {
        key: section.key,
        name: section.name,
        members: section.members,
        colors: section.colors,
        unavailable: section.unavailable,
        total: section.members.length,
        teams,
      };
    });
  }, [
    rows,
    namedGroups,
    groupOrderIndex,
    colorOverrides,
    moves,
    bibOverrides,
    bibSets,
  ]);

  // Everywhere a player can be sent. Each group offers a plain move — put them
  // in this group and let the split place them — ahead of its two teams, so
  // moving someone between groups needn't force a colour on them.
  const moveOptions = useMemo(
    () =>
      sections.flatMap((section) => [
        { value: `${section.key}:x`, label: section.name },
        ...(bibsEnabled
          ? section.teams.map((team, i) => ({
              value: `${section.key}:${i}`,
              label: `${section.name} · ${team.color.name}`,
            }))
          : []),
      ]),
    [sections, bibsEnabled]
  );

  const expected = rows.filter((r) => r.available === true).length;
  const notAvailable = rows.filter((r) => r.available === false).length;
  const noResponse = rows.filter((r) => r.available === undefined).length;

  // Export the register exactly as shown (current date + group filter, same
  // columns) to a CSV that opens directly in Excel. Attended is left blank so
  // it can be marked in the spreadsheet, mirroring the printed sheet.
  const exportCsv = () => {
    if (rows.length === 0) return;

    const headers = [
      "Group",
      ...(bibsEnabled ? ["Team", "Bib"] : []),
      "Player",
      "Age Group",
      "Position",
      "Club",
      "Other Groups",
      "Available",
      "Attended",
    ];

    const availableLabel = (available?: boolean) =>
      available === true ? "Yes" : available === false ? "No" : "No response";

    // Walk the sections rather than `rows` so the spreadsheet comes out in the
    // same order as the printed sheet, teams and all.
    const dataRows = sections.flatMap((section) => [
      ...section.teams.flatMap((team) =>
        team.players.map((r) => [
          section.name,
          // A blank bib cell is a player the set couldn't cover.
          ...(bibsEnabled
            ? [team.color.name, r.bib === null ? "" : String(r.bib)]
            : []),
          r.name,
          r.ageGroup,
          r.position || "",
          r.club,
          r.groups.length > 0 ? r.groups.join(", ") : "",
          availableLabel(r.available),
          "",
        ])
      ),
      ...section.unavailable.map((r) => [
        section.name,
        ...(bibsEnabled ? ["", ""] : []),
        r.name,
        r.ageGroup,
        r.position || "",
        r.club,
        r.groups.length > 0 ? r.groups.join(", ") : "",
        availableLabel(r.available),
        "",
      ]),
    ]);

    const csv = [headers, ...dataRows]
      .map((cols) => cols.map(csvCell).join(","))
      .join("\r\n");

    // Prepend a BOM so Excel reads it as UTF-8.
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const eventLabel = selectedEvent?.events?.date
      ? formatDate(selectedEvent.events.date)
      : "register";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(programme.name)}-register-${slugify(
      eventLabel
    )}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Bib swaps in for the row number when the split is on: the number a coach
  // reads off a player is the one on their back, not their place in a list.
  const columnCount = 9;

  const renderRow = (
    row: (typeof rows)[number],
    section: (typeof sections)[number],
    bib?: {
      color: BibColor;
      bib: number | null;
      setByHand: boolean;
      issue: "clash" | "outOfSet" | null;
    },
    index?: number,
    teamIndex?: number
  ) => {
    const otherGroups = row.groups.filter((g) => g !== section.name);
    // The control shows where the player is now, so a coach reads their
    // placement off the same cell they change it in.
    // A player pinned to a group but not to a half keeps showing the plain
    // group option, so it stays clear which half of the placement was chosen by
    // hand.
    const move = moves.get(row.id);
    const pinnedGroupOnly =
      move?.groupKey === section.key && move.team === undefined;
    const placement =
      !bibsEnabled || pinnedGroupOnly
        ? `${section.key}:x`
        : teamIndex !== undefined
        ? `${section.key}:${teamIndex}`
        : AUTO_PLACEMENT;

    return (
      <tr key={row.id} className="border-b border-border/50">
        <td className="py-2 px-2 text-muted">
          {bib ? (
            editingBib === row.id ? (
              <input
                // Focused on open: the chip was just clicked, so the number is
                // what the coach means to type into. A ref rather than
                // autoFocus, which lands on the page rather than on a control
                // the user has asked for.
                ref={(el) => el?.focus()}
                type="number"
                min={1}
                inputMode="numeric"
                className="w-16 h-7 rounded border border-input bg-transparent px-1 text-xs text-foreground"
                defaultValue={
                  bib.setByHand && bib.bib !== null ? String(bib.bib) : ""
                }
                placeholder={bib.bib !== null ? String(bib.bib) : "no bib"}
                aria-label={`Bib number for ${row.name}`}
                onBlur={(e) => {
                  setBibNumber(row.id, e.currentTarget.value);
                  setEditingBib(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  // Escape leaves the number as it was.
                  if (e.key === "Escape") setEditingBib(null);
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingBib(row.id)}
                title={
                  bib.bib === null
                    ? "The set ran out — click to put this player in a bib by hand"
                    : bib.issue === "clash"
                    ? "Another player in this colour has the same number — click to change"
                    : bib.issue === "outOfSet"
                    ? "Past the last number in this set — click to change"
                    : "Click to change this bib number"
                }
              >
                {bib.bib === null ? (
                  // The set has no bib left for this player. An empty box is
                  // honest and gives a coach somewhere to write what they
                  // handed out instead.
                  <span className="inline-flex items-center justify-center min-w-[1.75rem] h-6 px-1.5 rounded border border-dashed border-red-500 text-xs text-red-500">
                    —
                  </span>
                ) : (
                  <BibChip
                    color={bib.color}
                    label={String(bib.bib)}
                    className={cn(
                      bib.issue && "ring-2 ring-red-500",
                      bib.setByHand && "underline decoration-dotted"
                    )}
                  />
                )}
              </button>
            )
          ) : (
            index ?? ""
          )}
        </td>
        <td className="py-2 px-2 text-white">{row.name}</td>
        <td className="py-2 px-2 text-muted">{row.ageGroup}</td>
        <td className="py-2 px-2 text-muted">{row.position || "-"}</td>
        <td className="py-2 px-2 text-muted">{row.club}</td>
        <td className="py-2 px-2 text-muted">
          {otherGroups.length > 0 ? otherGroups.join(", ") : "-"}
        </td>
        <td className="py-2 px-2">
          {row.available === true && (
            <span className="text-green-500">Yes</span>
          )}
          {row.available === false && <span className="text-red-500">No</span>}
          {row.available === undefined && (
            <span className="text-muted">No response</span>
          )}
        </td>
        <td className="py-2 px-2">
          <span className="inline-block w-5 h-5 border border-border rounded-sm" />
        </td>
        <td className="no-print py-1 px-2">
          <Select value={placement} onValueChange={(v) => setMove(row.id, v)}>
            <SelectTrigger className="h-8 w-[190px] text-foreground border-input">
              <SelectValue placeholder="Move to…" />
            </SelectTrigger>
            <SelectContent className="text-foreground">
              <SelectGroup>
                <SelectItem value={AUTO_PLACEMENT} className="text-foreground">
                  Automatic
                </SelectItem>
                {moveOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="text-foreground"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </td>
      </tr>
    );
  };

  if (!programme) {
    return (
      <div className="container px-4 mx-auto py-10 text-foreground">
        <p>Programme not found.</p>
      </div>
    );
  }

  return (
    <div className="container px-4 mx-auto py-10 text-foreground">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="no-print flex flex-wrap gap-3 items-end justify-between mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Date</label>
            <Select
              value={selectedEventId}
              onValueChange={(v) => setParam("eventId", v)}
            >
              <SelectTrigger className="h-9 w-[280px] text-foreground border-input">
                <SelectValue placeholder="Select a date" />
              </SelectTrigger>
              <SelectContent className="text-foreground">
                <SelectGroup>
                  {programmeEvents.map((pe) => (
                    <SelectItem
                      key={pe.eventId}
                      value={pe.eventId}
                      className="text-foreground"
                    >
                      {pe.events?.date ? formatDate(pe.events.date) : "No date"}
                      {eventTimeRange(pe.events)
                        ? ` ${eventTimeRange(pe.events)}`
                        : ""}
                      {pe.events?.name ? ` — ${pe.events.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {playerGroups && playerGroups.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Group</label>
              <Select
                value={groupFilter}
                onValueChange={(v) => setParam("group", v)}
              >
                <SelectTrigger className="h-9 w-[200px] text-foreground border-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-foreground">
                  <SelectGroup>
                    <SelectItem value={ALL_GROUPS} className="text-foreground">
                      All players
                    </SelectItem>
                    {playerGroups.map((g) => (
                      <SelectItem
                        key={g.id}
                        value={g.id}
                        className="text-foreground"
                      >
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted">Bibs</span>
            <div className="flex items-center gap-2 h-9">
              <Switch
                id="bibs"
                checked={bibsEnabled}
                onCheckedChange={(on) => setParam("bibs", on ? "1" : "0")}
              />
              <label htmlFor="bibs" className="text-sm cursor-pointer">
                Split groups into two teams
              </label>

              {bibsEnabled && (
                <Dialog open={bibSetsOpen} onOpenChange={setBibSetsOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" className="h-8">
                      <Shirt className="w-4 h-4 mr-2" />
                      Bib sets
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="text-foreground max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Bib sets</DialogTitle>
                      <DialogDescription>
                        What each set actually holds — the number it stops at,
                        and any numbers it has lost. Registers number within
                        those bounds, so nobody is sent to the bag for a bib
                        that isn&apos;t in it. Saved against the club, not this
                        session. Leave the last number blank if a set
                        hasn&apos;t been counted.
                      </DialogDescription>
                    </DialogHeader>

                    <Form
                      method="post"
                      className="flex flex-col gap-3"
                      onSubmit={() => setBibSetsOpen(false)}
                    >
                      <div className="flex items-center gap-3 text-xs text-muted">
                        <span className="w-[6.5rem] shrink-0" />
                        <span className="w-20 shrink-0">Last number</span>
                        <span className="flex-1">Missing numbers</span>
                      </div>

                      {BIB_COLORS.map((color) => (
                        <div
                          key={`set-${color.id}`}
                          className="flex items-center gap-3"
                        >
                          <span className="flex items-center gap-2 w-[6.5rem] shrink-0">
                            <BibChip color={color} />
                            <span className="text-sm">{color.name}</span>
                          </span>
                          <Input
                            id={`highest-${color.id}`}
                            name={`highest-${color.id}`}
                            aria-label={`Last number in the ${color.name} set`}
                            defaultValue={bibSets[color.id]?.highest ?? ""}
                            placeholder="e.g. 15"
                            type="number"
                            min={1}
                            className="w-20 shrink-0 bg-card border-gray-600 text-white placeholder:text-gray-400"
                          />
                          <Input
                            id={`missing-${color.id}`}
                            name={`missing-${color.id}`}
                            aria-label={`Missing numbers in the ${color.name} set`}
                            defaultValue={(
                              bibSets[color.id]?.missing ?? []
                            ).join(", ")}
                            placeholder="e.g. 3, 7"
                            inputMode="numeric"
                            className="bg-card border-gray-600 text-white placeholder:text-gray-400"
                          />
                        </div>
                      ))}

                      <DialogFooter className="mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setBibSetsOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">Save</Button>
                      </DialogFooter>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline" className="h-9">
            <Link to={`/dashboard/programmes/${programme.id}`}>Back</Link>
          </Button>
          {bibOverrides.size > 0 && (
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={clearBibNumbers}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset {bibOverrides.size} bib
              {bibOverrides.size === 1 ? "" : "s"}
            </Button>
          )}
          {moves.size > 0 && (
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={clearMoves}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset {moves.size} move{moves.size === 1 ? "" : "s"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="h-9"
            onClick={exportCsv}
            disabled={rows.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button
            type="button"
            className="h-9"
            onClick={() => window.print()}
            disabled={rows.length === 0}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="register-sheet">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white">{programme.name}</h1>
          <p className="text-sm text-muted">
            Register
            {selectedEvent?.events?.date &&
              ` — ${formatDate(selectedEvent.events.date)}`}
            {eventTimeRange(selectedEvent?.events) &&
              ` ${eventTimeRange(selectedEvent.events)}`}
            {selectedEvent?.events?.name && ` (${selectedEvent.events.name})`}
            {selectedEvent?.events?.location &&
              ` · ${selectedEvent.events.location}`}
          </p>
          <p className="text-sm text-muted mt-1">
            {rows.length} player{rows.length === 1 ? "" : "s"} · {expected}{" "}
            available · {notAvailable} unavailable · {noResponse} no response
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="text-muted py-6">No players to show for this filter.</p>
        ) : (
          <div className="flex flex-col gap-10">
            {sections.map((section) => (
              <div key={section.key} className="register-section">
                <div className="flex flex-wrap gap-x-4 gap-y-2 items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold text-white">
                    {section.name}{" "}
                    <span className="text-sm font-normal text-muted">
                      ({section.total} player
                      {section.total === 1 ? "" : "s"})
                    </span>
                  </h2>

                  {bibsEnabled && (
                    <div className="no-print flex flex-wrap gap-2 items-center">
                      <span className="text-xs text-muted">Bib colours</span>
                      {section.colors.map((colorId, index) => (
                        <span
                          key={`${section.key}-color-${index}`}
                          className="flex items-center gap-1"
                        >
                          <Select
                            value={colorId}
                            onValueChange={(v) =>
                              setColorAt(section.key, index, v, section.colors)
                            }
                          >
                            <SelectTrigger className="h-8 w-[130px] text-foreground border-input">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="text-foreground">
                              <SelectGroup>
                                {BIB_COLORS.map((c) => (
                                  <SelectItem
                                    key={c.id}
                                    value={c.id}
                                    className="text-foreground"
                                  >
                                    <span className="flex items-center gap-2">
                                      <span
                                        className="inline-block w-3 h-3 rounded-sm border border-border"
                                        style={{ background: c.bg }}
                                      />
                                      {c.name}
                                      {index >= TEAM_COUNT && " (spare)"}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          {/* Only spares can go: the two teams always need a
                              colour each. */}
                          {index >= TEAM_COUNT && (
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              title={`Remove spare colour`}
                              onClick={() =>
                                removeColorAt(
                                  section.key,
                                  index,
                                  section.colors
                                )
                              }
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </span>
                      ))}
                      {section.colors.length < BIB_COLORS.length && (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8"
                          title="A team falls back to a spare when its own set hasn't the bibs to cover it"
                          onClick={() =>
                            addSpareColor(section.key, section.colors)
                          }
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Spare
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-muted font-medium w-[80px]">
                        {bibsEnabled ? "Bib" : "#"}
                      </th>
                      <th className="text-left py-2 px-2 text-muted font-medium">
                        Player
                      </th>
                      <th className="text-left py-2 px-2 text-muted font-medium">
                        Age Group
                      </th>
                      <th className="text-left py-2 px-2 text-muted font-medium">
                        Position
                      </th>
                      <th className="text-left py-2 px-2 text-muted font-medium">
                        Club
                      </th>
                      <th className="text-left py-2 px-2 text-muted font-medium">
                        Other Groups
                      </th>
                      <th className="text-left py-2 px-2 text-muted font-medium">
                        Available
                      </th>
                      <th className="text-left py-2 px-2 text-muted font-medium w-[90px]">
                        Attended
                      </th>
                      <th className="no-print text-left py-2 px-2 text-muted font-medium w-[190px]">
                        Move
                      </th>
                    </tr>
                  </thead>

                  {bibsEnabled ? (
                    <>
                      {section.teams.map((team, teamIndex) => (
                        <tbody key={`${section.key}-team-${teamIndex}`}>
                          {/* <tr>
                            <td
                              colSpan={columnCount}
                              className="pt-4 pb-1 px-2"
                            >
                              <span className="flex items-center gap-2 text-sm font-semibold text-white">
                                <BibChip color={team.color} />
                                {team.color.name} team
                                <span className="font-normal text-muted">
                                  {team.players.length} player
                                  {team.players.length === 1 ? "" : "s"}
                                  {team.firstBib > 0 &&
                                    ` · bibs ${team.firstBib}-${team.lastBib}`}
                                  {team.highest && ` of ${team.highest}`}
                                  {team.missing.length > 0 &&
                                    ` · ${team.missing.join(", ")} missing`}
                                </span>
                                {team.wearingSpare && (
                                  <span className="font-normal text-muted">
                                    ·{" "}
                                    {team.rescued
                                      ? "swapped in — the chosen set was short"
                                      : "spare — the chosen set was short"}
                                  </span>
                                )}
                                {team.shortfall > 0 && (
                                  <span className="font-normal text-red-500">
                                    · {team.shortfall} without a bib
                                  </span>
                                )}
                              </span>
                            </td>
                          </tr> */}
                          {team.players.map((row) =>
                            renderRow(
                              row,
                              section,
                              {
                                color: team.color,
                                bib: row.bib,
                                setByHand: row.bibSetByHand,
                                issue: row.bibIssue,
                              },
                              undefined,
                              teamIndex
                            )
                          )}
                          {team.players.length === 0 && (
                            <tr className="border-b border-border/50">
                              <td
                                colSpan={columnCount}
                                className="py-2 px-2 text-muted"
                              >
                                No players available for this team.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      ))}

                      {section.unavailable.length > 0 && (
                        <tbody>
                          <tr>
                            <td
                              colSpan={columnCount}
                              className="pt-4 pb-1 px-2"
                            >
                              <span className="text-sm font-semibold text-muted">
                                Not available ({section.unavailable.length}) —
                                no bib assigned
                              </span>
                            </td>
                          </tr>
                          {section.unavailable.map((row) =>
                            renderRow(row, section)
                          )}
                        </tbody>
                      )}
                    </>
                  ) : (
                    <tbody>
                      {section.members.map((row, i) =>
                        renderRow(row, section, undefined, i + 1)
                      )}
                    </tbody>
                  )}
                </table>
              </div>
            ))}

            <div className="register-section">
              <h2 className="text-lg font-semibold text-white mb-2">
                Walk-ups
              </h2>
              {/* Same columns as the group tables above so the two line up on
                  the printed page and a walk-up can be written straight in. */}
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted font-medium w-[60px]">
                      {bibsEnabled ? "Bib" : "#"}
                    </th>
                    <th className="text-left py-2 px-2 text-muted font-medium">
                      Player
                    </th>
                    <th className="text-left py-2 px-2 text-muted font-medium">
                      Age Group
                    </th>
                    <th className="text-left py-2 px-2 text-muted font-medium">
                      Position
                    </th>
                    <th className="text-left py-2 px-2 text-muted font-medium">
                      Club
                    </th>
                    <th className="text-left py-2 px-2 text-muted font-medium">
                      Group
                    </th>
                    <th className="text-left py-2 px-2 text-muted font-medium">
                      Available
                    </th>
                    <th className="text-left py-2 px-2 text-muted font-medium w-[90px]">
                      Attended
                    </th>
                    <th className="no-print text-left py-2 px-2 text-muted font-medium w-[190px]" />
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: BLANK_ROWS }, (_, i) => (
                    <tr
                      key={`blank-${i}`}
                      className="border-b border-border/50"
                    >
                      <td className="py-2 px-2 h-8" />
                      <td className="py-2 px-2" />
                      <td className="py-2 px-2" />
                      <td className="py-2 px-2" />
                      <td className="py-2 px-2" />
                      <td className="py-2 px-2" />
                      <td className="py-2 px-2" />
                      <td className="py-2 px-2">
                        <span className="inline-block w-5 h-5 border border-border rounded-sm" />
                      </td>
                      <td className="no-print py-2 px-2" />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
