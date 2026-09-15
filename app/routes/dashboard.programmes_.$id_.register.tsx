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
      if (missing.length > 0 || highest !== undefined) {
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
      // A set the club doesn't have is recorded as stopping at 0, so nothing is
      // ever dealt from it.
      if (formData.get(`owned-${color.id}`) !== "on") {
        highest[color.id] = 0;
        continue;
      }

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
 * Blank rows left at the foot of every group. A walk-up is nearly always
 * joining a particular group, so the coach needs somewhere to write them in
 * without flipping to the end of the sheet.
 */
const GROUP_WALKUP_ROWS = 4;

/**
 * An empty row in the same shape as a player row, so a name written in by hand
 * lines up with the columns above it.
 */
const renderBlankRow = (key: string) => (
  <tr key={key} className="border-b border-border/50">
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
);

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

/** Each team's colours, in the order bibs are dealt from them. */
type TeamColors = [string[], string[]];

/**
 * Groups run alongside each other on the same pitch, so each one is handed a
 * different pair of colours by default where the club owns enough. With fewer
 * sets than that the pairs come round again, which is safe: numbers are dealt
 * per colour across the whole sheet, so nobody shares a bib.
 */
const defaultTeamColors = (index: number, palette: string[]): TeamColors => [
  [palette[(index * 2) % palette.length]],
  [palette[(index * 2 + 1) % palette.length]],
];

const validColorIds = (list: string) =>
  list.split("-").filter((id) => BIB_COLORS.some((c) => c.id === id));

/**
 * Colour choices ride in the URL (`bibColors=<groupId>:pink-purple~white-blue`)
 * so a printed sheet and a shared link show the same teams. Each team lists its
 * own colours, dealt in order: a team uses up what's left of its first set
 * before starting on the next, which is how a side ends up in two colours.
 * Only groups that have been changed are stored; the rest fall back to the
 * default pair.
 */
const parseColorOverrides = (value: string | null): Map<string, TeamColors> => {
  const map = new Map<string, TeamColors>();
  if (!value) return map;
  for (const entry of value.split(",")) {
    const [key, list] = entry.split(":");
    if (!key || !list) continue;
    if (list.includes("~")) {
      const [a, b] = list.split("~").map(validColorIds);
      if (a?.length && b?.length) map.set(key, [a, b]);
      continue;
    }
    // Links from before teams had colours of their own: two team colours, then
    // spares either team could fall back on.
    const ids = validColorIds(list);
    if (ids.length >= 2) {
      const spares = ids.slice(2);
      map.set(key, [
        [ids[0], ...spares],
        [ids[1], ...spares],
      ]);
    }
  }
  return map;
};

const serialiseColorOverrides = (map: Map<string, TeamColors>) =>
  [...map.entries()]
    .map(([key, teams]) => `${key}:${teams.map((t) => t.join("-")).join("~")}`)
    .join(",");

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
 * any of this existed. A `highest` of 0 means the club has no bibs in that
 * colour at all.
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
 * Bib numbers set by hand, as `bibNumbers=<registrationId>:<colour>:<number>`.
 * Sets go missing numbers over a season and a team can be split across
 * colours, so a coach has to be able to put a player in whatever bib actually
 * exists. Older links carry no colour, which meant "in the team's colour".
 */
type BibOverride = { color?: string; number: number };

const parseBibOverrides = (value: string | null): Map<string, BibOverride> => {
  const map = new Map<string, BibOverride>();
  if (!value) return map;
  for (const entry of value.split(",")) {
    const parts = entry.split(":");
    const id = parts[0];
    const color = parts.length === 3 ? parts[1] : undefined;
    const number = Number(parts[parts.length - 1]);
    if (color && !BIB_COLORS.some((c) => c.id === color)) continue;
    if (id && Number.isInteger(number) && number > 0) {
      map.set(id, { color, number });
    }
  }
  return map;
};

const serialiseBibOverrides = (map: Map<string, BibOverride>) =>
  [...map.entries()]
    .map(([id, o]) =>
      o.color ? `${id}:${o.color}:${o.number}` : `${id}:${o.number}`
    )
    .join(",");

type BibIssue = "clash" | "outOfSet" | null;

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

/** Height of each scouting sheet page's title band. */
const SCOUT_TITLE_MM = 16;

/**
 * Row height on a group's scouting sheet page: the whole page shared between
 * its rows, kept tall enough to write in and short enough that a small group
 * doesn't get a page of one-line boxes the size of postcards.
 */
const scoutRowMm = (lines: number) =>
  Math.min(
    40,
    Math.max(10, (A4_PRINTABLE_MM.long - SCOUT_TITLE_MM) / Math.max(1, lines))
  );

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

/* The pitch sheet: bib, name and somewhere to write, sized from the headcount
   so the whole session lands on one side of A4. It only exists on paper, and
   only when asked for — Ctrl+P still prints the full register. */
.pitch-sheet { display: none; }
@media print {
  html[data-print="pitch"] .register-sheet { display: none !important; }
  html[data-print="pitch"] .register-page {
    padding: 0 !important;
    margin: 0 !important;
    max-width: none !important;
  }
  html[data-print="pitch"] .pitch-sheet { display: block !important; }
  .pitch-sheet, .pitch-sheet * {
    color: #000 !important;
    background: transparent !important;
  }
  .pitch-sheet { font-size: var(--pitch-font); line-height: 1.1; }
  .pitch-sheet .pitch-title {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 4mm;
    border-bottom: 0.5mm solid #000;
    padding-bottom: 1mm;
    margin-bottom: 2mm;
  }
  .pitch-sheet .pitch-title h1 { font-size: 13pt; font-weight: 700; }
  .pitch-sheet .pitch-title p { font-size: 8pt; }
  .pitch-sheet .pitch-columns {
    display: grid;
    grid-template-columns: repeat(var(--pitch-columns), minmax(0, 1fr));
    align-items: start;
    gap: 3mm 4mm;
  }
  .pitch-sheet .pitch-row,
  .pitch-sheet .pitch-heading {
    height: var(--pitch-row);
    break-inside: avoid;
  }
  .pitch-sheet .pitch-row {
    display: grid;
    grid-template-columns: 7mm 1fr minmax(8mm, 22%);
    align-items: center;
    gap: 1.5mm;
    border-bottom: 0.2mm solid #bbb;
  }
  .pitch-sheet .pitch-heading {
    display: flex;
    align-items: flex-end;
    gap: 1.5mm;
    padding-bottom: 0.5mm;
    font-weight: 700;
    break-after: avoid;
    border-bottom: 0.4mm solid #000;
  }
  .pitch-sheet .pitch-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pitch-sheet .pitch-score {
    align-self: stretch;
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    padding: 0 0.5mm 0.3mm;
    border-left: 0.2mm solid #bbb;
    font-size: 0.75em;
    color: #777 !important;
  }
  .pitch-sheet .bib-chip {
    background: var(--bib-bg) !important;
    color: var(--bib-fg) !important;
    border: 0.2mm solid #333 !important;
    height: calc(var(--pitch-row) - 1.2mm) !important;
    min-width: 7mm !important;
    padding: 0 !important;
    font-size: 1em !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .pitch-sheet .bib-empty {
    display: inline-block;
    height: calc(var(--pitch-row) - 1.2mm);
    width: 7mm;
    border: 0.2mm dashed #333;
    border-radius: 1mm;
  }
}

/* The scouting sheet: a number and room for notes, no names, so what gets
   written down is about what was seen rather than who it was. One page per
   group, each row as tall as the group's headcount allows. */
.scout-sheet { display: none; }
@media print {
  html[data-print="scouting"] .register-sheet { display: none !important; }
  html[data-print="scouting"] .register-page {
    padding: 0 !important;
    margin: 0 !important;
    max-width: none !important;
  }
  html[data-print="scouting"] .scout-sheet { display: block !important; }
  .scout-sheet, .scout-sheet * {
    color: #000 !important;
    background: transparent !important;
  }
  .scout-sheet .scout-page { break-after: page; font-size: 11pt; }
  .scout-sheet .scout-page:last-child { break-after: auto; }
  .scout-sheet .scout-title {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 4mm;
    height: ${SCOUT_TITLE_MM - 2}mm;
    margin-bottom: 2mm;
    border-bottom: 0.5mm solid #000;
  }
  .scout-sheet .scout-title h1 { font-size: 14pt; font-weight: 700; }
  .scout-sheet .scout-title p { font-size: 9pt; }
  .scout-sheet .scout-row {
    display: grid;
    grid-template-columns: 12mm 1fr;
    gap: 2mm;
    align-items: start;
    height: var(--scout-row);
    padding-top: 1mm;
    border-bottom: 0.2mm solid #999;
    break-inside: avoid;
  }
  .scout-sheet .scout-number {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 7mm;
    font-weight: 700;
  }
  .scout-sheet .bib-chip {
    background: var(--bib-bg) !important;
    color: var(--bib-fg) !important;
    border: 0.2mm solid #333 !important;
    height: 7mm !important;
    min-width: 11mm !important;
    padding: 0 !important;
    font-size: 11pt !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .scout-sheet .bib-empty {
    display: inline-block;
    height: 7mm;
    width: 11mm;
    border: 0.2mm dashed #333;
    border-radius: 1mm;
  }
}
`;

/**
 * Blank rows at the foot of each group on the pitch sheet. A walk-up is nearly
 * always joining a particular group, so they're written in under it.
 */
const PITCH_WALKUP_ROWS = 3;

/** Groups side by side before the sheet starts a second band of columns. */
const PITCH_MAX_COLUMNS = 6;

/** A4 at 12mm margins; four or more groups turn the page on its side. */
const A4_PRINTABLE_MM = { short: 186, long: 273 };
const PITCH_TITLE_MM = 14;

/**
 * Page shape, row height and type size for the pitch sheet: one column per
 * group, as tall as the biggest group needs. Type is capped by column width as
 * well as row height, so a narrow column doesn't lose every surname to an
 * ellipsis.
 */
const pitchLayout = (groupLines: number[]) => {
  const groups = Math.max(1, groupLines.length);
  const columns = Math.min(groups, PITCH_MAX_COLUMNS);
  const bands = Math.ceil(groups / columns);
  const landscape = columns >= 4;

  const pageWidth = landscape ? A4_PRINTABLE_MM.long : A4_PRINTABLE_MM.short;
  const pageHeight = landscape ? A4_PRINTABLE_MM.short : A4_PRINTABLE_MM.long;
  const columnWidth = (pageWidth - (columns - 1) * 4) / columns;

  const tallest = Math.max(1, ...groupLines);
  const usableHeight = pageHeight - PITCH_TITLE_MM - (bands - 1) * 3;
  const rowMm = Math.min(8, Math.max(3.5, usableHeight / (tallest * bands)));
  const fontPt = Math.min(11, Math.max(6.5, rowMm * 1.7), columnWidth * 0.26);

  return { columns, landscape, rowMm, fontPt };
};

/**
 * Print the pitch or scouting sheet in place of the full register, then put it
 * back. The page size is swapped in only for this print so the full register
 * keeps printing portrait.
 */
const printSheet = (sheet: "pitch" | "scouting", landscape: boolean) => {
  const root = document.documentElement;
  const page = document.createElement("style");
  page.textContent = `@media print { @page { size: A4 ${
    landscape ? "landscape" : "portrait"
  }; margin: 12mm; } }`;
  document.head.appendChild(page);
  root.dataset.print = sheet;

  const restore = () => {
    delete root.dataset.print;
    page.remove();
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
};

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

  // Clubs only own some colours. Anything unticked in Bib sets is never
  // suggested, though a colour already chosen stays selectable so its control
  // can still show it.
  const ownedColorIds = useMemo(() => {
    const owned = BIB_COLORS.filter((c) => bibSets[c.id]?.highest !== 0).map(
      (c) => c.id
    );
    return owned.length > 0 ? owned : BIB_COLORS.map((c) => c.id);
  }, [bibSets]);

  const colorChoices = (current: string) =>
    BIB_COLORS.filter((c) => ownedColorIds.includes(c.id) || c.id === current);

  // A group's colours are stored whole — both teams' lists — so changing one
  // slot writes the lot back.
  const setGroupColors = (groupKey: string, colors: TeamColors) => {
    const next = new Map(colorOverrides);
    next.set(groupKey, colors);
    setParam("bibColors", serialiseColorOverrides(next));
  };

  const updateTeamColors = (
    groupKey: string,
    current: TeamColors,
    teamIndex: number,
    change: (colors: string[]) => string[]
  ) => {
    const next: TeamColors = [[...current[0]], [...current[1]]];
    next[teamIndex] = change(next[teamIndex]);
    setGroupColors(groupKey, next);
  };

  const setTeamColorAt = (
    groupKey: string,
    current: TeamColors,
    teamIndex: number,
    colorIndex: number,
    colorId: string
  ) =>
    updateTeamColors(groupKey, current, teamIndex, (colors) =>
      colors.map((c, i) => (i === colorIndex ? colorId : c))
    );

  // The useful colour to add is one neither team is wearing yet; failing that,
  // any the club owns that this team isn't.
  const addTeamColor = (
    groupKey: string,
    current: TeamColors,
    teamIndex: number
  ) => {
    const inGroup = [...current[0], ...current[1]];
    const pick =
      ownedColorIds.find((id) => !inGroup.includes(id)) ??
      ownedColorIds.find((id) => !current[teamIndex].includes(id));
    if (!pick) return;
    updateTeamColors(groupKey, current, teamIndex, (colors) => [
      ...colors,
      pick,
    ]);
  };

  const removeTeamColorAt = (
    groupKey: string,
    current: TeamColors,
    teamIndex: number,
    colorIndex: number
  ) =>
    updateTeamColors(groupKey, current, teamIndex, (colors) =>
      colors.filter((_, i) => i !== colorIndex)
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
  // the bib they've actually been given, in the colour it is.
  const setBibNumber = (
    registrationId: string,
    colorId: string,
    value: string
  ) => {
    const next = new Map(bibOverrides);
    const parsed = Number(value.trim());
    if (!value.trim() || !Number.isInteger(parsed) || parsed < 1) {
      next.delete(registrationId);
    } else {
      next.set(registrationId, { color: colorId || undefined, number: parsed });
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
          defaultTeamColors(groupOrderIndex.get(key) ?? 0, ownedColorIds),
        rosters: [teamA, teamB],
      };
    });

    // The colour a hand-set bib is in. Older links carry only a number, which
    // meant the team's colour — its first colour now.
    const overrideColor = (override: BibOverride, teamColors: string[]) =>
      override.color ?? teamColors[0];

    // Every number claimed by hand, per colour, so nothing dealt automatically
    // lands on one.
    const claimedByColor = new Map<string, Set<number>>();
    for (const section of built) {
      section.rosters.forEach((roster, teamIndex) => {
        for (const player of roster) {
          const override = bibOverrides.get(player.id);
          if (!override) continue;
          const colorId = overrideColor(override, section.colors[teamIndex]);
          const claimed = claimedByColor.get(colorId) ?? new Set<number>();
          claimed.add(override.number);
          claimedByColor.set(colorId, claimed);
        }
      });
    }

    // Bibs are dealt per colour across the whole sheet rather than per team —
    // two groups both wearing pink would otherwise each field a Pink 3. The
    // second pink team carries on where the first stopped.
    const nextBibByColor = new Map<string, number>();
    const setOf = (colorId: string) => bibSets[colorId] ?? {};

    /**
     * The next bib of a colour still in the bag, skipping lost numbers and ones
     * claimed by hand; null once the set is spent. A set with no last number
     * recorded is bottomless, which is how the sheet behaved before anyone
     * counted the bag.
     */
    const peekBib = (colorId: string) => {
      const { highest, missing = [] } = setOf(colorId);
      if (highest === 0) return null;
      const claimed = claimedByColor.get(colorId);
      let n = nextBibByColor.get(colorId) ?? 1;
      while (missing.includes(n) || claimed?.has(n)) n += 1;
      return highest && n > highest ? null : n;
    };

    const colorOrder = BIB_COLORS.map((c) => c.id);

    const assembled = built.map((section) => {
      const teams = section.rosters.map((roster, teamIndex) => {
        const own = section.colors[teamIndex];
        const other = section.colors[1 - teamIndex];
        // Once a team's own colours are spent it borrows from the club's other
        // sets — never the other team's colours, or the two sides can't be
        // told apart.
        const borrowable = ownedColorIds.filter(
          (id) => !own.includes(id) && !other.includes(id)
        );

        // Each player takes the next bib from the team's first colour with any
        // left, so a set with three bibs remaining hands out those three and
        // the rest of the team moves on to the next colour.
        const players = roster.map((player) => {
          const override = bibOverrides.get(player.id);
          if (override) {
            const colorId = overrideColor(override, own);
            const highest = setOf(colorId).highest;
            return {
              ...player,
              bibColor: colorById(colorId),
              bib: override.number as number | null,
              bibSetByHand: true,
              borrowed: false,
              bibIssue: (highest !== undefined && override.number > highest
                ? "outOfSet"
                : null) as BibIssue,
            };
          }

          const ownColor = own.find((id) => peekBib(id) !== null);
          const colorId =
            ownColor ?? borrowable.find((id) => peekBib(id) !== null);
          const bib = colorId ? peekBib(colorId) : null;
          if (colorId && bib !== null) nextBibByColor.set(colorId, bib + 1);
          return {
            ...player,
            // With every set spent the empty box still sits under the team's
            // own colour.
            bibColor: colorById(colorId ?? own[0]),
            bib,
            bibSetByHand: false,
            borrowed: !ownColor && bib !== null,
            bibIssue: null as BibIssue,
          };
        });

        // The colours the team actually ended up in, its own first.
        const worn = [...own, ...colorOrder.filter((id) => !own.includes(id))]
          .map((id) => ({
            color: colorById(id),
            count: players.filter(
              (p) => p.bib !== null && p.bibColor.id === id
            ).length,
          }))
          .filter((w) => w.count > 0);

        return {
          index: teamIndex,
          colors: own.map(colorById),
          players,
          worn,
          borrowed: players.filter((p) => p.borrowed).length,
          shortfall: players.filter((p) => p.bib === null).length,
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

    // Last word on duplicates, counted against the colour each bib actually
    // is. Dealing steps round numbers set by hand, so this takes two players
    // given the same bib by hand — rare, but a sheet that prints it silently is
    // worse than one that says so.
    const wornByColor = new Map<string, Map<number, number>>();
    for (const section of assembled) {
      for (const team of section.teams) {
        for (const player of team.players) {
          if (player.bib === null) continue;
          const worn =
            wornByColor.get(player.bibColor.id) ?? new Map<number, number>();
          worn.set(player.bib, (worn.get(player.bib) ?? 0) + 1);
          wornByColor.set(player.bibColor.id, worn);
        }
      }
    }
    for (const section of assembled) {
      for (const team of section.teams) {
        for (const player of team.players) {
          if (player.bib === null) continue;
          if ((wornByColor.get(player.bibColor.id)?.get(player.bib) ?? 0) > 1) {
            player.bibIssue = "clash";
          }
        }
      }
    }

    return assembled;
  }, [
    rows,
    namedGroups,
    groupOrderIndex,
    colorOverrides,
    moves,
    bibOverrides,
    bibSets,
    ownedColorIds,
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
              label: `${section.name} · Team ${i + 1} (${team.colors
                .map((c) => c.name)
                .join("/")})`,
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
      ...(bibsEnabled ? ["Team", "Bib colour", "Bib"] : []),
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
            ? [
                `Team ${team.index + 1}`,
                r.bib === null ? "" : r.bibColor.name,
                r.bib === null ? "" : String(r.bib),
              ]
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
        ...(bibsEnabled ? ["", "", ""] : []),
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
      borrowed: boolean;
      issue: BibIssue;
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
              <form
                className="flex items-center gap-1"
                // Colour and number are one edit, so it's only committed once
                // focus has left both of them.
                onBlur={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node | null))
                    return;
                  const data = new FormData(e.currentTarget);
                  const colorId = String(data.get("color") ?? "");
                  const number = String(data.get("number") ?? "").trim();
                  // Opening and closing the editor on a dealt bib shouldn't
                  // pin it by hand.
                  const unchanged =
                    !bib.setByHand &&
                    colorId === bib.color.id &&
                    number === (bib.bib === null ? "" : String(bib.bib));
                  if (!unchanged) setBibNumber(row.id, colorId, number);
                  setEditingBib(null);
                }}
                onSubmit={(e) => {
                  e.preventDefault();
                  (document.activeElement as HTMLElement | null)?.blur();
                }}
                onKeyDown={(e) => {
                  // Escape leaves the bib as it was.
                  if (e.key === "Escape") setEditingBib(null);
                }}
              >
                <select
                  name="color"
                  defaultValue={bib.color.id}
                  aria-label={`Bib colour for ${row.name}`}
                  className="h-7 rounded border border-input bg-card px-1 text-xs text-foreground"
                >
                  {colorChoices(bib.color.id).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  // Focused once on open: the chip was just clicked, so the
                  // number is what the coach means to type into. Only once, so
                  // a re-render doesn't pull focus back off the colour.
                  ref={(el) => {
                    if (el && !el.dataset.focused) {
                      el.dataset.focused = "1";
                      el.focus();
                    }
                  }}
                  name="number"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  className="w-14 h-7 rounded border border-input bg-transparent px-1 text-xs text-foreground"
                  defaultValue={bib.bib !== null ? String(bib.bib) : ""}
                  placeholder="auto"
                  aria-label={`Bib number for ${row.name}`}
                />
              </form>
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
                    : bib.borrowed
                    ? "This team's colours ran out, so this bib is from another set — click to change"
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

  // The pitch sheet is for who is actually on the grass, so anyone who has
  // said they aren't coming is left off it whether or not bibs are on.
  const pitchSections = sections.map((section) => ({
    key: section.key,
    name: section.name,
    teams: bibsEnabled
      ? section.teams
          .filter((team) => team.players.length > 0)
          .map((team) => ({
            players: team.players.map((p) => ({
              id: p.id,
              name: p.name,
              bib: p.bib,
              color: p.bibColor as BibColor | undefined,
            })),
          }))
      : [
          {
            players: section.members
              .filter((r) => r.available !== false)
              .map((r) => ({
                id: r.id,
                name: r.name,
                bib: null as number | null,
                color: undefined as BibColor | undefined,
              })),
          },
        ],
  }));

  // Lines each group's column needs: its heading, a row per player and the
  // walk-up rows at the foot.
  const pitch = pitchLayout(
    pitchSections.map(
      (section) =>
        1 +
        PITCH_WALKUP_ROWS +
        section.teams.reduce((n, team) => n + team.players.length, 0)
    )
  );

  if (!programme) {
    return (
      <div className="container px-4 mx-auto py-10 text-foreground">
        <p>Programme not found.</p>
      </div>
    );
  }

  return (
    <div className="register-page container px-4 mx-auto py-10 text-foreground">
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
                        session. Untick any colour the club doesn&apos;t have,
                        and leave the last number blank if a set hasn&apos;t
                        been counted.
                      </DialogDescription>
                    </DialogHeader>

                    <Form
                      method="post"
                      className="flex flex-col gap-3"
                      onSubmit={() => setBibSetsOpen(false)}
                    >
                      <div className="flex items-center gap-3 text-xs text-muted">
                        <span className="w-[8rem] shrink-0">We have</span>
                        <span className="w-20 shrink-0">Last number</span>
                        <span className="flex-1">Missing numbers</span>
                      </div>

                      {BIB_COLORS.map((color) => (
                        <div
                          key={`set-${color.id}`}
                          className="flex items-center gap-3"
                        >
                          <label className="flex items-center gap-2 w-[8rem] shrink-0 cursor-pointer">
                            <input
                              type="checkbox"
                              name={`owned-${color.id}`}
                              defaultChecked={bibSets[color.id]?.highest !== 0}
                              aria-label={`The club has a ${color.name} set`}
                            />
                            <BibChip color={color} />
                            <span className="text-sm">{color.name}</span>
                          </label>
                          <Input
                            id={`highest-${color.id}`}
                            name={`highest-${color.id}`}
                            aria-label={`Last number in the ${color.name} set`}
                            defaultValue={bibSets[color.id]?.highest || ""}
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
          <Button
            type="button"
            variant="outline"
            className="h-9"
            onClick={() => printSheet("pitch", pitch.landscape)}
            disabled={rows.length === 0}
            title="Bib, name and a score out of 6 — fits on one side of A4"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print pitch sheet
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9"
            onClick={() => printSheet("scouting", false)}
            disabled={rows.length === 0}
            title="Numbers and space for notes, no names — one page per group"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print scouting sheet
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
                    <div className="no-print flex flex-col gap-2 items-start">
                      {section.teams.map((team) => {
                        const teamColors = section.colors[team.index];
                        return (
                          <div
                            key={`${section.key}-colors-${team.index}`}
                            className="flex flex-wrap gap-2 items-center"
                          >
                            <span className="text-xs text-muted w-12">
                              Team {team.index + 1}
                            </span>
                            {teamColors.map((colorId, colorIndex) => (
                              <span
                                key={`${section.key}-${team.index}-${colorIndex}`}
                                className="flex items-center gap-1"
                              >
                                <Select
                                  value={colorId}
                                  onValueChange={(v) =>
                                    setTeamColorAt(
                                      section.key,
                                      section.colors,
                                      team.index,
                                      colorIndex,
                                      v
                                    )
                                  }
                                >
                                  <SelectTrigger className="h-8 w-[120px] text-foreground border-input">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="text-foreground">
                                    <SelectGroup>
                                      {colorChoices(colorId).map((c) => (
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
                                {/* A team always needs at least one colour. */}
                                {teamColors.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                    title="Remove this colour from the team"
                                    onClick={() =>
                                      removeTeamColorAt(
                                        section.key,
                                        section.colors,
                                        team.index,
                                        colorIndex
                                      )
                                    }
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                )}
                              </span>
                            ))}
                            {ownedColorIds.some(
                              (id) => !teamColors.includes(id)
                            ) && (
                              <Button
                                type="button"
                                variant="outline"
                                className="h-8"
                                title="Once the colours before it run out, the rest of this team is dealt from this one"
                                onClick={() =>
                                  addTeamColor(
                                    section.key,
                                    section.colors,
                                    team.index
                                  )
                                }
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Colour
                              </Button>
                            )}
                            <span className="text-xs text-muted">
                              {team.players.length} player
                              {team.players.length === 1 ? "" : "s"}
                              {team.worn
                                .map(
                                  (w) =>
                                    ` · ${w.count} ${w.color.name.toLowerCase()}`
                                )
                                .join("")}
                            </span>
                            {team.borrowed > 0 && (
                              <span className="text-xs text-amber-500">
                                · {team.borrowed} borrowed from another set
                              </span>
                            )}
                            {team.shortfall > 0 && (
                              <span className="text-xs text-red-500">
                                · {team.shortfall} without a bib
                              </span>
                            )}
                          </div>
                        );
                      })}
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
                                color: row.bibColor,
                                bib: row.bib,
                                setByHand: row.bibSetByHand,
                                borrowed: row.borrowed,
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

                      {/* Players with no bib are there for the coach on
                          screen; on paper they only pad the sheet out. */}
                      {section.unavailable.length > 0 && (
                        <tbody className="no-print">
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

                  <tbody>
                    <tr>
                      <td colSpan={columnCount} className="pt-4 pb-1 px-2">
                        <span className="text-sm font-semibold text-muted">
                          Walk-ups
                        </span>
                      </td>
                    </tr>
                    {Array.from({ length: GROUP_WALKUP_ROWS }, (_, i) =>
                      renderBlankRow(`${section.key}-walkup-${i}`)
                    )}
                  </tbody>
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
                  {Array.from({ length: BLANK_ROWS }, (_, i) =>
                    renderBlankRow(`blank-${i}`)
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div
        className="pitch-sheet"
        style={
          {
            "--pitch-columns": pitch.columns,
            "--pitch-row": `${pitch.rowMm}mm`,
            "--pitch-font": `${pitch.fontPt}pt`,
          } as CSSProperties
        }
      >
        <div className="pitch-title">
          <h1>{programme.name}</h1>
          <p>
            {selectedEvent?.events?.date &&
              formatDate(selectedEvent.events.date)}
            {eventTimeRange(selectedEvent?.events) &&
              ` ${eventTimeRange(selectedEvent?.events)}`}
            {selectedEvent?.events?.location &&
              ` · ${selectedEvent.events.location}`}
          </p>
        </div>

        <div className="pitch-columns">
          {pitchSections.map((section) => (
            <div key={`pitch-${section.key}`}>
              <div className="pitch-heading">{section.name}</div>
              {section.teams.map((team, teamIndex) => (
                <div key={`pitch-${section.key}-${teamIndex}`}>
                  {team.players.map((player, i) => (
                    <div key={`pitch-${player.id}`} className="pitch-row">
                      <span>
                        {!player.color ? (
                          i + 1
                        ) : player.bib === null ? (
                          <span className="bib-empty" />
                        ) : (
                          <BibChip
                            color={player.color}
                            label={String(player.bib)}
                          />
                        )}
                      </span>
                      <span className="pitch-name">{player.name}</span>
                      <span className="pitch-score">/6</span>
                    </div>
                  ))}
                </div>
              ))}
              {Array.from({ length: PITCH_WALKUP_ROWS }, (_, i) => (
                <div
                  key={`pitch-${section.key}-walkup-${i}`}
                  className="pitch-row"
                >
                  <span />
                  <span />
                  <span className="pitch-score">/6</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="scout-sheet">
        {pitchSections.map((section) => {
          const players = section.teams
            .flatMap((team) => team.players)
            .map((player, i) => ({ ...player, position: i + 1 }));
          const rowMm = scoutRowMm(players.length + PITCH_WALKUP_ROWS);
          return (
            <div
              key={`scout-${section.key}`}
              className="scout-page"
              style={{ "--scout-row": `${rowMm}mm` } as CSSProperties}
            >
              <div className="scout-title">
                <h1>{section.name}</h1>
                <p>
                  {programme.name}
                  {selectedEvent?.events?.date &&
                    ` · ${formatDate(selectedEvent.events.date)}`}
                  {eventTimeRange(selectedEvent?.events) &&
                    ` ${eventTimeRange(selectedEvent?.events)}`}
                </p>
              </div>
              {players.map((player) => (
                <div key={`scout-${player.id}`} className="scout-row">
                  <span className="scout-number">
                    {!player.color ? (
                      player.position
                    ) : player.bib === null ? (
                      <span className="bib-empty" />
                    ) : (
                      <BibChip
                        color={player.color}
                        label={String(player.bib)}
                      />
                    )}
                  </span>
                  <span />
                </div>
              ))}
              {Array.from({ length: PITCH_WALKUP_ROWS }, (_, i) => (
                <div
                  key={`scout-${section.key}-walkup-${i}`}
                  className="scout-row"
                >
                  <span className="scout-number" />
                  <span />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
