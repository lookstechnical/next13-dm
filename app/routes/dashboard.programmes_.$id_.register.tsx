import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { Printer, Download, RotateCcw } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { GroupService } from "~/services/groupService";
import { ProgrammeService } from "~/services/programmeService";
import type {
  PlayerGroup,
  ProgrammeEvent,
  ProgrammeEventAvailability,
  ProgrammeRegistration,
} from "~/types";
import { withAuth } from "~/utils/auth-helpers";
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

    return {
      programme,
      programmeEvents,
      registrations,
      availability,
      playerGroups,
    };
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
 * Colour choices ride in the URL (`bibColors=<groupId>:red-blue,...`) so a
 * printed sheet and a shared link show the same teams. Only groups that have
 * been changed are stored; the rest fall back to the default pair.
 */
const parseColorOverrides = (value: string | null): Map<string, string[]> => {
  const map = new Map<string, string[]>();
  if (!value) return map;
  for (const entry of value.split(",")) {
    const [key, pair] = entry.split(":");
    const ids = (pair ?? "").split("-").filter(Boolean);
    if (key && ids.length === 2) map.set(key, ids);
  }
  return map;
};

const serialiseColorOverrides = (map: Map<string, string[]>) =>
  [...map.entries()].map(([key, ids]) => `${key}:${ids.join("-")}`).join(",");

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
const BibChip = ({ color, label }: { color: BibColor; label?: string }) => (
  <span
    className="bib-chip inline-flex items-center justify-center min-w-[1.75rem] h-6 px-1.5 rounded border border-border text-xs font-semibold"
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
  } = useLoaderData<{
    programme: { id: string; name: string };
    programmeEvents: ProgrammeEvent[];
    registrations: ProgrammeRegistration[];
    availability: ProgrammeEventAvailability[];
    playerGroups: PlayerGroup[];
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

  const selectedEvent = programmeEvents.find(
    (pe) => pe.eventId === selectedEventId
  );

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next, { replace: true, preventScrollReset: true });
  };

  // Changing one half's colour keeps the other half as it stands, so the pair
  // has to be written back whole.
  const setTeamColor = (
    groupKey: string,
    teamIndex: 0 | 1,
    colorId: string,
    currentPair: string[]
  ) => {
    const pair = [...currentPair];
    pair[teamIndex] = colorId;
    const next = new Map(colorOverrides);
    next.set(groupKey, pair);
    setParam("bibColors", serialiseColorOverrides(next));
  };

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

    // Bib numbers are handed out per colour across the whole sheet, not per
    // team: two groups both wearing red would otherwise each field a Red 3.
    // The second red team simply carries on from where the first stopped.
    const nextBibByColor = new Map<string, number>();

    return orderedKeys.map((key) => {
      const members = byGroup.get(key) ?? [];
      // Placing someone by hand says they're playing, whatever they answered —
      // a coach reaching for the control is usually looking at the player.
      const placedByHand = (row: (typeof rows)[number]) =>
        moves.get(row.id)?.team;
      const playing = members.filter(
        (r) => r.available !== false || placedByHand(r) !== undefined
      );
      const unavailable = members.filter(
        (r) => r.available === false && placedByHand(r) === undefined
      );
      const [teamA, teamB] = splitIntoTeams(playing, placedByHand);
      const pair =
        colorOverrides.get(key) ??
        defaultColorPair(groupOrderIndex.get(key) ?? 0);

      return {
        key,
        name: groupNames.get(key) ?? UNGROUPED_NAME,
        members,
        colorPair: pair,
        teams: [teamA, teamB].map((players, teamIndex) => {
          const color = colorById(pair[teamIndex]);
          const first = nextBibByColor.get(color.id) ?? 1;
          nextBibByColor.set(color.id, first + players.length);
          return {
            color,
            firstBib: first,
            lastBib: first + Math.max(players.length - 1, 0),
            players: players.map((player, i) => ({
              ...player,
              bib: first + i,
            })),
          };
        }),
        unavailable,
        total: members.length,
      };
    });
  }, [rows, namedGroups, groupOrderIndex, colorOverrides, moves]);

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
          ...(bibsEnabled ? [team.color.name, String(r.bib)] : []),
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
    bib?: { color: BibColor; bib: number },
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
            <BibChip color={bib.color} label={String(bib.bib)} />
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
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline" className="h-9">
            <Link to={`/dashboard/programmes/${programme.id}`}>Back</Link>
          </Button>
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
                      {section.teams.map((team, teamIndex) => (
                        <Select
                          key={`${section.key}-color-${teamIndex}`}
                          value={team.color.id}
                          onValueChange={(v) =>
                            setTeamColor(
                              section.key,
                              teamIndex as 0 | 1,
                              v,
                              section.colorPair
                            )
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
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      ))}
                    </div>
                  )}
                </div>

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
                                  {team.players.length > 0 &&
                                    ` · bibs ${team.firstBib}-${team.lastBib}`}
                                </span>
                              </span>
                            </td>
                          </tr> */}
                          {team.players.map((row) =>
                            renderRow(
                              row,
                              section,
                              { color: team.color, bib: row.bib },
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
