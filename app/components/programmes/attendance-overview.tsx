import { Form, useFetcher, useSearchParams } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import {
  PlayerGroup,
  ProgrammeRegistration,
  ProgrammeEventAvailability,
  ProgrammeEventAttendance,
  ProgrammeEvent,
} from "~/types";
import {
  calculateAgeGroup,
  eventTimeRange,
  formatDate,
} from "~/utils/helpers";
import {
  BIB_COLORS,
  colorById,
  isBibColorId,
  type BibSet,
} from "~/utils/bibs";
import { POSITION_GROUPS } from "~/utils/position-groups";
import { Check, X, Trash2, Minus, AlertTriangle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type AttendanceOverviewProps = {
  registrations: ProgrammeRegistration[];
  programmeEvents: ProgrammeEvent[];
  availability: ProgrammeEventAvailability[];
  attendance: ProgrammeEventAttendance[];
  playerGroups?: PlayerGroup[];
  bibSets?: Record<string, BibSet>;
};

type ViewMode = "availability" | "attendance";
type GroupFilter = "all" | "with" | "without" | string;
type PositionScope = "primary" | "secondary" | "both";
// Narrows the list by what a player actually turned up to, relative to the
// sessions they said they were available for.
type AttendanceFilter = "all" | "never" | "missed" | "attended";
type SortKey =
  | "name"
  | "position"
  | "availability_desc"
  | "availability_asc"
  | "group";

// How players the main sort leaves level are ordered.
type ThenByKey = "name" | "position";

// Position order follows POSITION_GROUPS (outside backs through to back row),
// then the order positions are listed within a group. Unknown or missing
// positions sort last.
const positionRank = (position?: string | null): number => {
  if (!position) return Infinity;
  for (const [groupIndex, group] of POSITION_GROUPS.entries()) {
    const index = group.positions.indexOf(position);
    if (index !== -1) return groupIndex * 100 + index;
  }
  return Infinity;
};

const byPosition = (a: ProgrammeRegistration, b: ProgrammeRegistration) => {
  const aRank = positionRank(a.players?.position);
  const bRank = positionRank(b.players?.position);
  return aRank === bRank ? 0 : aRank < bRank ? -1 : 1;
};

const byName = (a: ProgrammeRegistration, b: ProgrammeRegistration) =>
  (a.players?.name ?? "").localeCompare(b.players?.name ?? "");

const ALL_VALUE = "__all__";

/**
 * Filters and sorting live in the URL so a filtered list can be shared or
 * bookmarked. Each value has a default that's left out of the URL, keeping
 * links short: an unfiltered list is just the programme's address.
 */
const PARAM_DEFAULTS = {
  view: "availability",
  position: ALL_VALUE,
  scope: "primary",
  age: ALL_VALUE,
  club: ALL_VALUE,
  group: "all",
  attendance: "all",
  event: ALL_VALUE,
  sort: "name",
  then: "name",
} as const;

type ParamKey = keyof typeof PARAM_DEFAULTS;

// A hand-edited or stale link can carry anything; values outside a fixed set
// fall back to the default rather than leaving a control showing nothing.
const oneOf = <T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T,
): T => (value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback);
// Players without a club recorded still need to be selectable as a set.
const NO_CLUB_VALUE = "__no_club__";

const clubOf = (reg: ProgrammeRegistration): string | null =>
  reg.players?.club?.trim() || null;

// A single clickable attendance cell. Clicking cycles through:
// not recorded (–) → present (✓) → absent (✗) → not recorded. Each change is
// saved immediately via a fetcher, with the pending value shown optimistically.
const AttendanceCell: React.FC<{
  registrationId: string;
  eventId: string;
  attended: boolean | undefined;
}> = ({ registrationId, eventId, attended }) => {
  const fetcher = useFetcher();

  // While a change is in flight, reflect the value we just submitted.
  const pending = fetcher.formData?.get("attended") as string | undefined;
  const current: boolean | undefined =
    pending === "present"
      ? true
      : pending === "absent"
      ? false
      : pending === "unset"
      ? undefined
      : attended;

  const next =
    current === undefined ? "present" : current === true ? "absent" : "unset";

  const label =
    current === true
      ? "Present — click to mark absent"
      : current === false
      ? "Absent — click to clear"
      : "Not recorded — click to mark present";

  return (
    <td className="text-center py-2 px-2">
      <button
        type="button"
        title={label}
        aria-label={label}
        onClick={() =>
          fetcher.submit(
            { intent: "setAttendance", registrationId, eventId, attended: next },
            { method: "post" },
          )
        }
        className={[
          "w-8 h-8 rounded-md border inline-flex items-center justify-center mx-auto transition-colors",
          current === true
            ? "border-green-500/40 bg-green-500/10 hover:bg-green-500/20"
            : current === false
            ? "border-red-500/40 bg-red-500/10 hover:bg-red-500/20"
            : "border-border hover:bg-card/60",
        ].join(" ")}
      >
        {current === true && <Check className="w-4 h-4 text-green-500" />}
        {current === false && <X className="w-4 h-4 text-red-500" />}
        {current === undefined && <Minus className="w-4 h-4 text-muted" />}
      </button>
    </td>
  );
};

// The availability equivalent of AttendanceCell, so staff can correct what a
// player said they could do. Clicking cycles: not set (–) → available (✓) →
// unavailable (✗) → not set. Saving a change also adds or removes the player's
// registration for that event.
const AvailabilityCell: React.FC<{
  registrationId: string;
  playerId: string;
  eventId: string;
  available: boolean | undefined;
  editable: boolean;
}> = ({ registrationId, playerId, eventId, available, editable }) => {
  const fetcher = useFetcher();

  const pending = fetcher.formData?.get("available") as string | undefined;
  const current: boolean | undefined =
    pending === "available"
      ? true
      : pending === "unavailable"
      ? false
      : pending === "unset"
      ? undefined
      : available;

  const next =
    current === undefined
      ? "available"
      : current === true
      ? "unavailable"
      : "unset";

  // Read-only unless editing is explicitly switched on, so a stray click can't
  // overwrite what the player told us.
  if (!editable) {
    return (
      <td className="text-center py-3 px-2">
        {current === true && (
          <Check className="w-4 h-4 text-green-500 mx-auto" />
        )}
        {current === false && <X className="w-4 h-4 text-red-500 mx-auto" />}
        {current === undefined && <span className="text-muted">-</span>}
      </td>
    );
  }

  const label =
    current === true
      ? "Available — click to mark unavailable"
      : current === false
      ? "Unavailable — click to clear"
      : "Not set — click to mark available";

  return (
    <td className="text-center py-2 px-2">
      <button
        type="button"
        title={label}
        aria-label={label}
        disabled={!playerId}
        onClick={() =>
          fetcher.submit(
            {
              intent: "setAvailability",
              registrationId,
              playerId,
              eventId,
              available: next,
            },
            { method: "post" },
          )
        }
        className={[
          "w-8 h-8 rounded-md border inline-flex items-center justify-center mx-auto transition-colors",
          current === true
            ? "border-green-500/40 bg-green-500/10 hover:bg-green-500/20"
            : current === false
            ? "border-red-500/40 bg-red-500/10 hover:bg-red-500/20"
            : "border-border hover:bg-card/60",
          !playerId ? "opacity-50 cursor-not-allowed" : "",
        ].join(" ")}
      >
        {current === true && <Check className="w-4 h-4 text-green-500" />}
        {current === false && <X className="w-4 h-4 text-red-500" />}
        {current === undefined && <Minus className="w-4 h-4 text-muted" />}
      </button>
    </td>
  );
};

const NO_BIB_COLOR = "__none__";

const bibKey = (color: string, number: number) => `${color}:${number}`;

// The bib a player wears for the programme: a colour and a number, each saved
// as soon as it's set. The number saves on blur or Enter rather than on every
// keystroke, so typing "12" never briefly hands someone bib 1.
const BibCell: React.FC<{
  registrationId: string;
  bibColor?: string | null;
  bibNumber?: number | null;
  clash: boolean;
  bibSets: Record<string, BibSet>;
}> = ({ registrationId, bibColor, bibNumber, clash, bibSets }) => {
  const fetcher = useFetcher<{ bibSetFull?: boolean }>();

  const pendingColor = fetcher.formData?.get("bibColor") as string | undefined;
  const pendingNumber = fetcher.formData?.get("bibNumber") as
    | string
    | undefined;
  const autoNumbering = fetcher.formData?.get("autoNumber") === "1";
  const color =
    pendingColor !== undefined
      ? pendingColor
      : isBibColorId(bibColor)
      ? bibColor
      : "";
  const savedNumber = autoNumbering
    ? ""
    : pendingNumber !== undefined
    ? pendingNumber
    : bibNumber
    ? String(bibNumber)
    : "";

  const [draft, setDraft] = useState(savedNumber);
  // Follow the saved value when it changes underneath us (another row's save
  // revalidating the page, or a reload), but not while this cell is saving.
  useEffect(() => {
    if (fetcher.state === "idle") setDraft(bibNumber ? String(bibNumber) : "");
  }, [bibNumber, fetcher.state]);

  const save = (nextColor: string, nextNumber: string, autoNumber = false) =>
    fetcher.submit(
      {
        intent: "setBib",
        registrationId,
        bibColor: nextColor,
        bibNumber: nextNumber.trim(),
        autoNumber: autoNumber ? "1" : "0",
      },
      { method: "post" },
    );

  // A new colour gets the next free bib in that set, worked out on the server.
  // The one exception is a number typed before any colour was picked — that's
  // the bib the coach is holding, so it stays. "No bib" takes the bib back.
  const changeColor = (next: string) => {
    if (next === color) return;
    if (!next) {
      setDraft("");
      save("", "");
    } else if (!color && draft.trim()) {
      save(next, draft);
    } else {
      setDraft("");
      save(next, "", true);
    }
  };

  // Colours the club has no bibs in aren't offered, bar the one already chosen.
  const colorChoices = BIB_COLORS.filter(
    (c) => bibSets[c.id]?.highest !== 0 || c.id === color,
  );
  const setFull =
    fetcher.state === "idle" && fetcher.data?.bibSetFull && !bibNumber;

  const commitNumber = () => {
    const trimmed = draft.trim();
    const parsed = Number(trimmed);
    const valid = trimmed === "" || (Number.isInteger(parsed) && parsed > 0);
    if (!valid) {
      setDraft(savedNumber);
      return;
    }
    if (trimmed !== savedNumber) save(color, trimmed);
  };

  const swatch = color ? colorById(color) : null;

  return (
    <td className="py-2 px-2">
      <div className="flex items-center gap-1">
        <Select
          value={color || NO_BIB_COLOR}
          onValueChange={(v) => changeColor(v === NO_BIB_COLOR ? "" : v)}
        >
          <SelectTrigger
            className="h-8 w-[104px] text-xs text-foreground border-input"
            aria-label="Bib colour"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="text-foreground">
            <SelectGroup>
              <SelectItem value={NO_BIB_COLOR} className="text-foreground">
                No bib
              </SelectItem>
              {colorChoices.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-foreground">
                  <span className="inline-flex items-center gap-2">
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
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          value={autoNumbering ? "" : draft}
          placeholder={autoNumbering ? "…" : "#"}
          aria-label="Bib number"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitNumber}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="h-8 w-14 px-1 text-center text-xs font-semibold"
          style={
            swatch ? { background: swatch.bg, color: swatch.fg } : undefined
          }
        />
        {setFull && swatch && (
          <span title={`No ${swatch.name} bibs left in the set`}>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </span>
        )}
        {clash && (
          <span title="Another player has this bib">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </span>
        )}
      </div>
    </td>
  );
};

const PlayerRow: React.FC<{
  reg: ProgrammeRegistration;
  programmeEvents: ProgrammeEvent[];
  viewMode: ViewMode;
  getAvailability: (
    registrationId: string,
    eventId: string,
  ) => boolean | undefined;
  getAttendance: (
    registrationId: string,
    eventId: string,
  ) => boolean | undefined;
  playerGroups?: PlayerGroup[];
  total: number;
  editAvailability: boolean;
  bibClash: boolean;
  bibSets: Record<string, BibSet>;
}> = ({
  reg,
  programmeEvents,
  viewMode,
  getAvailability,
  getAttendance,
  playerGroups,
  total,
  editAvailability,
  bibClash,
  bibSets,
}) => {
  const fetcher = useFetcher();
  const ageGroup = reg.players?.dateOfBirth
    ? calculateAgeGroup(reg.players.dateOfBirth)
    : "Unknown";

  const handleGroupAssign = (groupId: string) => {
    if (!reg.players?.id) return;
    fetcher.submit(
      { intent: "assignToGroup", groupId, playerId: reg.players.id },
      { method: "post" },
    );
  };

  const playerId = reg.players?.id || "";
  const assignedGroupIds = playerGroups
    ?.filter((g) => g.playerIds?.includes(playerId))
    .map((g) => g.id);
  const currentGroupId = assignedGroupIds?.[0];

  return (
    <tr className="border-b border-border/50">
      <td className="py-3 px-2">
        <div className="flex items-center gap-2">
          {reg.players?.photoUrl ? (
            <img
              src={reg.players.photoUrl}
              alt={reg.players.name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="lucide lucide-user text-gray-400"
                aria-hidden="true"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
          )}
          <span className="text-white flex-1">{reg.players?.name}</span>
        </div>
      </td>
      <td className="py-3 px-2">
        <span className="text-xs text-muted">{ageGroup}</span>
      </td>
      <td className="py-3 px-2">
        <span className="text-xs text-white">
          {reg.players?.position || "-"}
        </span>
      </td>
      <td className="py-3 px-2">
        <span className="text-xs text-muted">
          {reg.players?.secondaryPosition || "-"}
        </span>
      </td>
      <td className="py-3 px-2">
        <span className="text-xs text-muted">{clubOf(reg) || "-"}</span>
      </td>
      <BibCell
        registrationId={reg.id}
        bibColor={reg.bibColor}
        bibNumber={reg.bibNumber}
        clash={bibClash}
        bibSets={bibSets}
      />
      {playerGroups && playerGroups.length > 0 && (
        <td className="py-3 px-2">
          <Select value={currentGroupId} onValueChange={handleGroupAssign}>
            <SelectTrigger className="h-8 text-xs w-full text-foreground border-input">
              <SelectValue placeholder="Select group" />
            </SelectTrigger>
            <SelectContent className="text-foreground">
              <SelectGroup>
                <SelectLabel className="text-foreground">Groups</SelectLabel>
                {playerGroups.map((g) => {
                  const isAssigned = assignedGroupIds?.includes(g.id);
                  return (
                    <SelectItem
                      key={g.id}
                      value={g.id}
                      className="text-foreground"
                    >
                      {g.name}
                      {isAssigned && (
                        <Check className="inline w-3 h-3 ml-1 text-green-500" />
                      )}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
          {fetcher.state === "submitting" && (
            <span className="text-xs text-muted ml-1">Saving...</span>
          )}
        </td>
      )}
      {programmeEvents.map((pe) => {
        if (viewMode === "attendance") {
          return (
            <AttendanceCell
              key={pe.id}
              registrationId={reg.id}
              eventId={pe.eventId}
              attended={getAttendance(reg.id, pe.eventId)}
            />
          );
        }
        return (
          <AvailabilityCell
            key={pe.id}
            registrationId={reg.id}
            playerId={playerId}
            eventId={pe.eventId}
            available={getAvailability(reg.id, pe.eventId)}
            editable={editAvailability}
          />
        );
      })}
      <td className="text-center py-3 px-2">
        <span className="text-white font-medium">{total}</span>
        <span className="text-muted">/{programmeEvents.length}</span>
      </td>
      <td className="text-center py-3 px-2">
        <Form method="post">
          <input type="hidden" name="intent" value="removeRegistration" />
          <input type="hidden" name="registrationId" value={reg.id} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive h-8 w-8 p-0"
            onClick={(e) => {
              if (
                !confirm(`Remove ${reg.players?.name} from this programme?`)
              ) {
                e.preventDefault();
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </Form>
      </td>
    </tr>
  );
};

export const AttendanceOverview: React.FC<AttendanceOverviewProps> = ({
  registrations,
  programmeEvents,
  availability,
  attendance,
  playerGroups,
  bibSets = {},
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Every change replaces the history entry rather than adding one, so Back
  // leaves the page instead of stepping through each filter tweak.
  const updateParams = (updates: Partial<Record<ParamKey, string>>) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(updates)) {
          if (value === undefined || value === PARAM_DEFAULTS[key as ParamKey]) {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        }
        return next;
      },
      { replace: true, preventScrollReset: true },
    );

  const param = (key: ParamKey) => searchParams.get(key) ?? PARAM_DEFAULTS[key];

  const viewMode = oneOf<ViewMode>(
    searchParams.get("view"),
    ["availability", "attendance"],
    "availability",
  );
  const setViewMode = (value: ViewMode) => updateParams({ view: value });
  // Availability is the player's own answer, so editing is off by default and
  // has to be switched on deliberately. Deliberately not in the URL: a shared
  // link should never open with editing armed.
  const [editAvailability, setEditAvailability] = useState(false);
  const positionFilter = oneOf(
    searchParams.get("position"),
    POSITION_GROUPS.map((g) => g.label),
    ALL_VALUE,
  );
  const setPositionFilter = (value: string) => updateParams({ position: value });
  const positionScope = oneOf<PositionScope>(
    searchParams.get("scope"),
    ["primary", "secondary", "both"],
    "primary",
  );
  const setPositionScope = (value: PositionScope) =>
    updateParams({ scope: value });
  const ageGroupFilter = param("age");
  const setAgeGroupFilter = (value: string) => updateParams({ age: value });
  const clubFilter = param("club");
  const setClubFilter = (value: string) => updateParams({ club: value });
  const groupFilter: GroupFilter = param("group");
  const setGroupFilter = (value: GroupFilter) => updateParams({ group: value });
  const attendanceFilter = oneOf<AttendanceFilter>(
    searchParams.get("attendance"),
    ["all", "never", "missed", "attended"],
    "all",
  );
  const setAttendanceFilter = (value: AttendanceFilter) =>
    updateParams({ attendance: value });
  // Narrows the list to players who said they're available for one event.
  const eventFilter = param("event");
  const setEventFilter = (value: string) => updateParams({ event: value });
  const sortBy = oneOf<SortKey>(
    searchParams.get("sort"),
    ["name", "position", "availability_desc", "availability_asc", "group"],
    "name",
  );
  const setSortBy = (value: SortKey) => updateParams({ sort: value });
  const thenBy = oneOf<ThenByKey>(
    searchParams.get("then"),
    ["name", "position"],
    "name",
  );
  const setThenBy = (value: ThenByKey) => updateParams({ then: value });

  const getAvailability = (
    registrationId: string,
    eventId: string,
  ): boolean | undefined => {
    const record = availability.find(
      (a) =>
        a.programmeRegistrationId === registrationId && a.eventId === eventId,
    );
    return record?.available;
  };

  const attendanceByKey = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const a of attendance) {
      map.set(`${a.programmeRegistrationId}:${a.eventId}`, a.attended);
    }
    return map;
  }, [attendance]);

  const getAttendance = (
    registrationId: string,
    eventId: string,
  ): boolean | undefined => {
    return attendanceByKey.get(`${registrationId}:${eventId}`);
  };

  const attendedCountByRegistration = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of attendance) {
      if (a.attended) {
        map.set(
          a.programmeRegistrationId,
          (map.get(a.programmeRegistrationId) ?? 0) + 1,
        );
      }
    }
    return map;
  }, [attendance]);

  const availableCountByRegistration = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of availability) {
      if (a.available) {
        map.set(
          a.programmeRegistrationId,
          (map.get(a.programmeRegistrationId) ?? 0) + 1,
        );
      }
    }
    return map;
  }, [availability]);

  // Only sessions that have already been and gone can tell us anything about
  // no-shows. A session counts as past once its day is over, so a session
  // happening today never marks anyone down before the register is taken.
  const pastEventIds = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const set = new Set<string>();
    for (const pe of programmeEvents) {
      const date = pe.events?.date;
      if (date && new Date(date).getTime() < todayStart.getTime()) {
        set.add(pe.eventId);
      }
    }
    return set;
  }, [programmeEvents]);

  // Past sessions each player put themselves down as available for — the
  // baseline we judge "didn't turn up" against.
  const pastAvailableEventsByRegistration = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const a of availability) {
      if (!a.available || !pastEventIds.has(a.eventId)) continue;
      const list = map.get(a.programmeRegistrationId) ?? [];
      list.push(a.eventId);
      map.set(a.programmeRegistrationId, list);
    }
    return map;
  }, [availability, pastEventIds]);

  // Players who said they were available for a past session and were never
  // marked present for any session at all.
  const neverAttendedIds = useMemo(() => {
    const set = new Set<string>();
    for (const [registrationId] of pastAvailableEventsByRegistration) {
      if ((attendedCountByRegistration.get(registrationId) ?? 0) === 0) {
        set.add(registrationId);
      }
    }
    return set;
  }, [pastAvailableEventsByRegistration, attendedCountByRegistration]);

  // Players who missed at least one past session they were available for,
  // whether or not they showed up to others.
  const missedSessionIds = useMemo(() => {
    const set = new Set<string>();
    for (const [
      registrationId,
      eventIds,
    ] of pastAvailableEventsByRegistration) {
      const missed = eventIds.some(
        (eventId) =>
          attendanceByKey.get(`${registrationId}:${eventId}`) !== true,
      );
      if (missed) set.add(registrationId);
    }
    return set;
  }, [pastAvailableEventsByRegistration, attendanceByKey]);

  const playerIdToGroupIds = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const g of playerGroups ?? []) {
      for (const pid of g.playerIds ?? []) {
        const list = map.get(pid) ?? [];
        list.push(g.id);
        map.set(pid, list);
      }
    }
    return map;
  }, [playerGroups]);

  // Groups come back from the service in name order, so a group's place in the
  // list is its place in the sort.
  const groupSortIndex = useMemo(() => {
    const map = new Map<string, number>();
    (playerGroups ?? []).forEach((g, i) => map.set(g.id, i));
    return map;
  }, [playerGroups]);

  const ageGroupOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of registrations) {
      const dob = r.players?.dateOfBirth;
      if (dob) set.add(calculateAgeGroup(dob));
    }
    const order = ["U12", "U13", "U14", "U15", "U16", "U17", "U18", "Senior"];
    return Array.from(set).sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [registrations]);

  const availableRegistrationIdsByEvent = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const a of availability) {
      if (!a.available) continue;
      const set = map.get(a.eventId) ?? new Set<string>();
      set.add(a.programmeRegistrationId);
      map.set(a.eventId, set);
    }
    return map;
  }, [availability]);

  // The players the summary boxes count. Picking an event narrows them to who
  // is available for it, so the boxes show the shape of that session's squad.
  const eventRegistrations = useMemo(() => {
    if (eventFilter === ALL_VALUE) return registrations;
    const available = availableRegistrationIdsByEvent.get(eventFilter);
    return registrations.filter((r) => available?.has(r.id));
  }, [registrations, eventFilter, availableRegistrationIdsByEvent]);

  const ageGroupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of eventRegistrations) {
      const ag = r.players?.dateOfBirth
        ? calculateAgeGroup(r.players.dateOfBirth)
        : "Unknown";
      counts.set(ag, (counts.get(ag) ?? 0) + 1);
    }
    const order = ["U12", "U13", "U14", "U15", "U16", "U17", "U18", "Senior"];
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => {
        const ai = order.indexOf(a.label);
        const bi = order.indexOf(b.label);
        if (ai === -1 && bi === -1) return a.label.localeCompare(b.label);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
  }, [eventRegistrations]);

  // Clubs present in this programme, alphabetical, with "No club" last so the
  // unrecorded players are still reachable.
  const clubOptions = useMemo(() => {
    const counts = new Map<string, number>();
    let noClub = 0;
    for (const r of registrations) {
      const club = clubOf(r);
      if (club) counts.set(club, (counts.get(club) ?? 0) + 1);
      else noClub += 1;
    }
    const options = Array.from(counts.entries())
      .map(([label, count]) => ({ value: label, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
    if (noClub > 0) {
      options.push({
        value: NO_CLUB_VALUE,
        label: "No club recorded",
        count: noClub,
      });
    }
    return options;
  }, [registrations]);

  const positionOptions = useMemo(() => {
    const present = new Set<string>();
    for (const r of registrations) {
      if (r.players?.position) present.add(r.players.position);
      if (r.players?.secondaryPosition)
        present.add(r.players.secondaryPosition);
    }
    return POSITION_GROUPS.filter((g) =>
      g.positions.some((p) => present.has(p)),
    );
  }, [registrations]);

  const matchesPositionGroup = (
    primary: string | null | undefined,
    secondary: string | null | undefined,
    positions: string[],
  ): boolean => {
    const primaryMatch = !!primary && positions.includes(primary);
    const secondaryMatch = !!secondary && positions.includes(secondary);
    return positionScope === "primary"
      ? primaryMatch
      : positionScope === "secondary"
      ? secondaryMatch
      : primaryMatch || secondaryMatch;
  };

  const positionGroupCounts = useMemo(() => {
    return POSITION_GROUPS.map((g) => {
      let count = 0;
      for (const r of eventRegistrations) {
        if (
          matchesPositionGroup(
            r.players?.position,
            r.players?.secondaryPosition,
            g.positions,
          )
        ) {
          count += 1;
        }
      }
      return { label: g.label, count };
    }).filter((entry) => entry.count > 0);
  }, [eventRegistrations, positionScope]);

  // Said next to the box headings, so it's clear the counts are for one event.
  const selectedEvent = programmeEvents.find((pe) => pe.eventId === eventFilter);
  const eventCountsNote = selectedEvent
    ? ` · available for ${selectedEvent.events?.name ?? "event"}`
    : "";

  const eventPlayerIdToRegistration = useMemo(() => {
    const map = new Map<string, ProgrammeRegistration>();
    for (const r of eventRegistrations) {
      if (r.players?.id) map.set(r.players.id, r);
    }
    return map;
  }, [eventRegistrations]);

  const playerGroupBreakdowns = useMemo(() => {
    if (!playerGroups) return [];
    const order = ["U12", "U13", "U14", "U15", "U16", "U17", "U18", "Senior"];
    return playerGroups
      .map((pg) => {
        // Only group members on the programme (and, with an event picked,
        // available for it) count — the group itself can be much bigger.
        const playerIds = (pg.playerIds ?? []).filter((pid) =>
          eventPlayerIdToRegistration.has(pid),
        );
        const total = playerIds.length;
        const breakdown = POSITION_GROUPS.map((g) => {
          let count = 0;
          for (const pid of playerIds) {
            const reg = eventPlayerIdToRegistration.get(pid);
            if (!reg) continue;
            if (
              matchesPositionGroup(
                reg.players?.position,
                reg.players?.secondaryPosition,
                g.positions,
              )
            ) {
              count += 1;
            }
          }
          return { label: g.label, count };
        }).filter((entry) => entry.count > 0);
        const ageCounts = new Map<string, number>();
        for (const pid of playerIds) {
          const reg = eventPlayerIdToRegistration.get(pid);
          const dob = reg?.players?.dateOfBirth;
          const ag = dob ? calculateAgeGroup(dob) : "Unknown";
          ageCounts.set(ag, (ageCounts.get(ag) ?? 0) + 1);
        }
        const ageBreakdown = Array.from(ageCounts.entries())
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => {
            const ai = order.indexOf(a.label);
            const bi = order.indexOf(b.label);
            if (ai === -1 && bi === -1) return a.label.localeCompare(b.label);
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
          });
        return { id: pg.id, name: pg.name, total, breakdown, ageBreakdown };
      })
      .filter((entry) => entry.total > 0);
  }, [playerGroups, eventPlayerIdToRegistration, positionScope]);


  // Bibs worn by more than one player. Checked across the whole programme, not
  // just the filtered rows — a clash hidden by a filter is still a clash.
  const clashingBibs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of registrations) {
      if (!isBibColorId(r.bibColor) || !r.bibNumber) continue;
      const key = bibKey(r.bibColor, r.bibNumber);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return new Set(
      [...counts.entries()].filter(([, n]) => n > 1).map(([key]) => key),
    );
  }, [registrations]);

  const visibleRegistrations = useMemo(() => {
    const activeGroup =
      positionFilter === ALL_VALUE
        ? null
        : POSITION_GROUPS.find((g) => g.label === positionFilter);
    const filtered = registrations.filter((r) => {
      if (activeGroup) {
        const primary = r.players?.position;
        const secondary = r.players?.secondaryPosition;
        const primaryMatch =
          !!primary && activeGroup.positions.includes(primary);
        const secondaryMatch =
          !!secondary && activeGroup.positions.includes(secondary);
        const matches =
          positionScope === "primary"
            ? primaryMatch
            : positionScope === "secondary"
            ? secondaryMatch
            : primaryMatch || secondaryMatch;
        if (!matches) return false;
      }
      if (ageGroupFilter !== ALL_VALUE) {
        const ag = r.players?.dateOfBirth
          ? calculateAgeGroup(r.players.dateOfBirth)
          : "Unknown";
        if (ag !== ageGroupFilter) return false;
      }
      if (clubFilter !== ALL_VALUE) {
        const club = clubOf(r);
        if (clubFilter === NO_CLUB_VALUE) {
          if (club) return false;
        } else if (club !== clubFilter) {
          return false;
        }
      }
      if (groupFilter !== "all") {
        const assignedIds = playerIdToGroupIds.get(r.players?.id ?? "") ?? [];
        const hasGroup = assignedIds.length > 0;
        if (groupFilter === "with") {
          if (!hasGroup) return false;
        } else if (groupFilter === "without") {
          if (hasGroup) return false;
        } else if (!assignedIds.includes(groupFilter)) {
          return false;
        }
      }
      if (attendanceFilter === "never") {
        if (!neverAttendedIds.has(r.id)) return false;
      } else if (attendanceFilter === "missed") {
        if (!missedSessionIds.has(r.id)) return false;
      } else if (attendanceFilter === "attended") {
        if ((attendedCountByRegistration.get(r.id) ?? 0) === 0) return false;
      }
      if (eventFilter !== ALL_VALUE) {
        if (!availableRegistrationIdsByEvent.get(eventFilter)?.has(r.id)) {
          return false;
        }
      }
      return true;
    });

    const primary = (a: ProgrammeRegistration, b: ProgrammeRegistration) => {
      switch (sortBy) {
        case "availability_desc":
          return (
            (availableCountByRegistration.get(b.id) ?? 0) -
            (availableCountByRegistration.get(a.id) ?? 0)
          );
        case "availability_asc":
          return (
            (availableCountByRegistration.get(a.id) ?? 0) -
            (availableCountByRegistration.get(b.id) ?? 0)
          );
        case "position":
          return byPosition(a, b);
        case "group": {
          // A player in several groups sorts under the first by name — the
          // same group the register files them under. Ungrouped players last.
          const rank = (r: ProgrammeRegistration) => {
            const ids = playerIdToGroupIds.get(r.players?.id ?? "") ?? [];
            return ids.length > 0
              ? Math.min(...ids.map((id) => groupSortIndex.get(id) ?? Infinity))
              : Infinity;
          };
          const aRank = rank(a);
          const bRank = rank(b);
          return aRank === bRank ? 0 : aRank < bRank ? -1 : 1;
        }
        case "name":
        default:
          return byName(a, b);
      }
    };

    // Ties on the main sort go to the chosen secondary order, and name always
    // settles whatever is left so the list never shuffles between renders.
    const sorted = [...filtered];
    sorted.sort(
      (a, b) =>
        primary(a, b) ||
        (thenBy === "position" ? byPosition(a, b) : 0) ||
        byName(a, b),
    );
    return sorted;
  }, [
    registrations,
    positionFilter,
    positionScope,
    ageGroupFilter,
    clubFilter,
    groupFilter,
    attendanceFilter,
    eventFilter,
    sortBy,
    thenBy,
    availableCountByRegistration,
    availableRegistrationIdsByEvent,
    attendedCountByRegistration,
    neverAttendedIds,
    missedSessionIds,
    playerIdToGroupIds,
    groupSortIndex,
  ]);

  const visibleRegistrationIds = useMemo(
    () => new Set(visibleRegistrations.map((r) => r.id)),
    [visibleRegistrations],
  );

  const getEventAttendanceCount = (eventId: string): number => {
    return availability.filter(
      (a) =>
        a.eventId === eventId &&
        a.available &&
        visibleRegistrationIds.has(a.programmeRegistrationId),
    ).length;
  };

  const getEventPresentCount = (eventId: string): number => {
    return attendance.filter(
      (a) =>
        a.eventId === eventId &&
        a.attended &&
        visibleRegistrationIds.has(a.programmeRegistrationId),
    ).length;
  };

  if (registrations.length === 0) {
    return (
      <div className="text-center py-10 text-muted">
        <p>No registrations yet.</p>
      </div>
    );
  }

  const hasGroupColumn = !!(playerGroups && playerGroups.length > 0);
  const filtersActive =
    positionFilter !== ALL_VALUE ||
    positionScope !== "primary" ||
    ageGroupFilter !== ALL_VALUE ||
    clubFilter !== ALL_VALUE ||
    groupFilter !== "all" ||
    attendanceFilter !== "all" ||
    eventFilter !== ALL_VALUE ||
    sortBy !== "name" ||
    thenBy !== "name";

  // Overall expected (available) vs attended (present) across every event, for
  // the players currently visible under the active filters.
  const totalExpected = programmeEvents.reduce(
    (sum, pe) => sum + getEventAttendanceCount(pe.eventId),
    0,
  );
  const totalAttended = programmeEvents.reduce(
    (sum, pe) => sum + getEventPresentCount(pe.eventId),
    0,
  );
  const overallRate =
    totalExpected > 0 ? Math.round((totalAttended / totalExpected) * 100) : null;

  const rateColor = (rate: number | null) =>
    rate === null
      ? "text-muted"
      : rate >= 75
      ? "text-green-500"
      : rate >= 50
      ? "text-yellow-500"
      : "text-red-500";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div
          className="inline-flex h-9 rounded-md border border-input overflow-hidden"
          role="group"
          aria-label="View mode"
        >
          {(
            [
              { value: "availability", label: "Availability" },
              { value: "attendance", label: "Attendance" },
            ] as { value: ViewMode; label: string }[]
          ).map((opt, i) => {
            const active = viewMode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setViewMode(opt.value);
                  // Never leave editing armed when coming back to this view.
                  setEditAvailability(false);
                }}
                className={[
                  "px-4 text-sm",
                  i > 0 ? "border-l border-input" : "",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-foreground hover:bg-card/50",
                ].join(" ")}
                aria-pressed={active}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {viewMode === "attendance" ? (
          <p className="text-xs text-muted">
            Click a cell to cycle: not recorded → present → absent
          </p>
        ) : (
          <div className="flex items-center gap-3">
            {editAvailability && (
              <p className="text-xs text-yellow-500">
                Editing on — clicking a cell overwrites what the player set.
                Cycles: not set → available → unavailable
              </p>
            )}
            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
              <Switch
                checked={editAvailability}
                onCheckedChange={setEditAvailability}
                aria-label="Edit availability"
              />
              Edit availability
            </label>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Position</label>
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="h-9 w-[160px] text-foreground border-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="text-foreground">
              <SelectGroup>
                <SelectItem value={ALL_VALUE} className="text-foreground">
                  All positions
                </SelectItem>
                {positionOptions.map((g) => (
                  <SelectItem
                    key={g.label}
                    value={g.label}
                    className="text-foreground"
                  >
                    {g.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Match on</label>
          <div
            className="inline-flex h-9 rounded-md border border-input overflow-hidden"
            role="group"
            aria-label="Position match scope"
          >
            {(
              [
                { value: "primary", label: "Primary" },
                { value: "secondary", label: "Secondary" },
                { value: "both", label: "Both" },
              ] as { value: PositionScope; label: string }[]
            ).map((opt, i) => {
              const active = positionScope === opt.value;
              const disabled = positionFilter === ALL_VALUE;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => setPositionScope(opt.value)}
                  className={[
                    "px-3 text-xs",
                    i > 0 ? "border-l border-input" : "",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent text-foreground hover:bg-card/50",
                    disabled ? "opacity-50 cursor-not-allowed" : "",
                  ].join(" ")}
                  aria-pressed={active}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Age group</label>
          <Select value={ageGroupFilter} onValueChange={setAgeGroupFilter}>
            <SelectTrigger className="h-9 w-[160px] text-foreground border-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="text-foreground">
              <SelectGroup>
                <SelectItem value={ALL_VALUE} className="text-foreground">
                  All age groups
                </SelectItem>
                {ageGroupOptions.map((ag) => (
                  <SelectItem key={ag} value={ag} className="text-foreground">
                    {ag}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {clubOptions.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Club</label>
            <Select value={clubFilter} onValueChange={setClubFilter}>
              <SelectTrigger className="h-9 w-[200px] text-foreground border-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-foreground max-h-72">
                <SelectGroup>
                  <SelectItem value={ALL_VALUE} className="text-foreground">
                    All clubs
                  </SelectItem>
                  {clubOptions.map((c) => (
                    <SelectItem
                      key={c.value}
                      value={c.value}
                      className="text-foreground"
                    >
                      {c.label} ({c.count})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Group</label>
          <Select
            value={groupFilter}
            onValueChange={(v) => setGroupFilter(v as GroupFilter)}
          >
            <SelectTrigger className="h-9 w-[180px] text-foreground border-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="text-foreground">
              <SelectGroup>
                <SelectItem value="all" className="text-foreground">
                  All players
                </SelectItem>
                <SelectItem value="with" className="text-foreground">
                  In a group
                </SelectItem>
                <SelectItem value="without" className="text-foreground">
                  Not in a group
                </SelectItem>
              </SelectGroup>
              {playerGroups && playerGroups.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-foreground">Groups</SelectLabel>
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
              )}
            </SelectContent>
          </Select>
        </div>

        {programmeEvents.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Available for</label>
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="h-9 w-[230px] text-foreground border-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-foreground">
                <SelectGroup>
                  <SelectItem value={ALL_VALUE} className="text-foreground">
                    Any event
                  </SelectItem>
                  {programmeEvents.map((pe) => (
                    <SelectItem
                      key={pe.id}
                      value={pe.eventId}
                      className="text-foreground"
                    >
                      {pe.events?.name ?? "Event"}
                      {pe.events?.date ? ` · ${formatDate(pe.events.date)}` : ""}{" "}
                      ({availableRegistrationIdsByEvent.get(pe.eventId)?.size ?? 0})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Attendance</label>
          <Select
            value={attendanceFilter}
            onValueChange={(v) => setAttendanceFilter(v as AttendanceFilter)}
          >
            <SelectTrigger className="h-9 w-[230px] text-foreground border-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="text-foreground">
              <SelectGroup>
                <SelectItem value="all" className="text-foreground">
                  All players
                </SelectItem>
                <SelectItem value="never" className="text-foreground">
                  Never attended ({neverAttendedIds.size})
                </SelectItem>
                <SelectItem value="missed" className="text-foreground">
                  Missed a session ({missedSessionIds.size})
                </SelectItem>
                <SelectItem value="attended" className="text-foreground">
                  Attended at least once
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Sort by</label>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="h-9 w-[200px] text-foreground border-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="text-foreground">
              <SelectGroup>
                <SelectItem value="name" className="text-foreground">
                  Name (A–Z)
                </SelectItem>
                <SelectItem value="position" className="text-foreground">
                  Position
                </SelectItem>
                <SelectItem
                  value="availability_desc"
                  className="text-foreground"
                >
                  Availability (high → low)
                </SelectItem>
                <SelectItem
                  value="availability_asc"
                  className="text-foreground"
                >
                  Availability (low → high)
                </SelectItem>
                <SelectItem value="group" className="text-foreground">
                  Group
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {sortBy !== "name" && sortBy !== "position" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Then by</label>
            <Select
              value={thenBy}
              onValueChange={(v) => setThenBy(v as ThenByKey)}
            >
              <SelectTrigger className="h-9 w-[150px] text-foreground border-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-foreground">
                <SelectGroup>
                  <SelectItem value="name" className="text-foreground">
                    Name (A–Z)
                  </SelectItem>
                  <SelectItem value="position" className="text-foreground">
                    Position
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}

        {filtersActive && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => {
              // One update for the lot — separate calls in the same tick
              // would each start from the old URL and undo one another.
              updateParams({ ...PARAM_DEFAULTS, view: viewMode });
            }}
          >
            Clear
          </Button>
        )}

        <div className="ml-auto text-xs text-muted self-center">
          Showing {visibleRegistrations.length} of {registrations.length}
        </div>
      </div>

      {(attendanceFilter === "never" || attendanceFilter === "missed") && (
        <p className="text-xs text-muted mb-4">
          {pastEventIds.size === 0
            ? "No sessions have taken place yet, so there is nothing to compare availability against."
            : attendanceFilter === "never"
            ? "Players who marked themselves available for a session that has already taken place, but have never been marked present."
            : "Players who marked themselves available for a session that has already taken place, but were not marked present for it."}
        </p>
      )}

      {positionGroupCounts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {positionGroupCounts.map((entry) => {
            const active = positionFilter === entry.label;
            return (
              <button
                key={entry.label}
                type="button"
                onClick={() =>
                  setPositionFilter(active ? ALL_VALUE : entry.label)
                }
                className={[
                  "flex items-center gap-2 px-3 py-2 rounded-md border text-left transition-colors",
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-card/50",
                ].join(" ")}
                aria-pressed={active}
              >
                <span className="text-xs text-muted">{entry.label}</span>
                <span className="text-sm font-medium text-white">
                  {entry.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {ageGroupCounts.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted mb-2">
            By age group{eventCountsNote}
          </p>
          <div className="flex flex-wrap gap-2">
            {ageGroupCounts.map((entry) => {
              const active = ageGroupFilter === entry.label;
              return (
                <button
                  key={entry.label}
                  type="button"
                  onClick={() =>
                    setAgeGroupFilter(active ? ALL_VALUE : entry.label)
                  }
                  className={[
                    "flex items-center gap-2 px-3 py-2 rounded-md border text-left transition-colors",
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-card/50",
                  ].join(" ")}
                  aria-pressed={active}
                >
                  <span className="text-xs text-muted">{entry.label}</span>
                  <span className="text-sm font-medium text-white">
                    {entry.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {playerGroupBreakdowns.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted mb-2">
            By group{eventCountsNote}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {playerGroupBreakdowns.map((pg) => {
              const active = groupFilter === pg.id;
              return (
              <button
                key={pg.id}
                type="button"
                onClick={() => setGroupFilter(active ? "all" : pg.id)}
                aria-pressed={active}
                className={[
                  "p-3 rounded-md border text-left transition-colors",
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card/30 hover:bg-card/50",
                ].join(" ")}
              >
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-sm font-medium text-white">
                    {pg.name}
                  </span>
                  <span className="text-xs text-muted">
                    {pg.total} player{pg.total === 1 ? "" : "s"}
                  </span>
                </div>
                {pg.ageBreakdown.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {pg.ageBreakdown.map((entry) => (
                      <span
                        key={entry.label}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-card/50 text-xs"
                      >
                        <span className="text-muted">{entry.label}</span>
                        <span className="text-white font-medium">
                          {entry.count}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
                {pg.breakdown.length === 0 ? (
                  <p className="text-xs text-muted">No matching positions</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {pg.breakdown.map((entry) => (
                      <li
                        key={entry.label}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-muted">{entry.label}</span>
                        <span className="text-white font-medium">
                          {entry.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-2 text-muted font-medium">
                Player
              </th>
              <th className="text-left py-3 px-2 text-muted font-medium">
                Age Group
              </th>
              <th className="text-left py-3 px-2 text-muted font-medium">
                Position
              </th>
              <th className="text-left py-3 px-2 text-muted font-medium">
                Secondary
              </th>
              <th className="text-left py-3 px-2 text-muted font-medium">
                Club
              </th>
              <th className="text-left py-3 px-2 text-muted font-medium">
                Bib
              </th>
              {hasGroupColumn && (
                <th className="text-left py-3 px-2 text-muted font-medium min-w-[160px]">
                  Assign to Group
                </th>
              )}
              {programmeEvents.map((pe) => (
                <th
                  key={pe.id}
                  className="text-center py-3 px-2 text-muted font-medium min-w-[100px]"
                >
                  <div>{pe.events?.name}</div>
                  {pe.events?.date && (
                    <div className="text-xs font-normal">
                      {formatDate(pe.events.date)}
                    </div>
                  )}
                  {eventTimeRange(pe.events) && (
                    <div className="text-xs font-normal text-muted">
                      {eventTimeRange(pe.events)}
                    </div>
                  )}
                </th>
              ))}
              <th className="text-center py-3 px-2 text-muted font-medium min-w-[80px]">
                Total
              </th>
              <th className="text-center py-3 px-2 text-muted font-medium w-[60px]" />
            </tr>
          </thead>
          <tbody>
            {visibleRegistrations.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    6 + (hasGroupColumn ? 1 : 0) + programmeEvents.length + 2
                  }
                  className="text-center py-6 text-muted"
                >
                  No registrations match the current filters.
                </td>
              </tr>
            ) : (
              visibleRegistrations.map((reg) => (
                <PlayerRow
                  key={reg.id}
                  reg={reg}
                  programmeEvents={programmeEvents}
                  viewMode={viewMode}
                  getAvailability={getAvailability}
                  getAttendance={getAttendance}
                  playerGroups={playerGroups}
                  total={
                    viewMode === "attendance"
                      ? attendedCountByRegistration.get(reg.id) ?? 0
                      : availableCountByRegistration.get(reg.id) ?? 0
                  }
                  editAvailability={editAvailability}
                  bibSets={bibSets}
                  bibClash={
                    isBibColorId(reg.bibColor) &&
                    !!reg.bibNumber &&
                    clashingBibs.has(bibKey(reg.bibColor, reg.bibNumber))
                  }
                />
              ))
            )}
            <tr className="border-t border-border">
              <td className="py-3 px-2 font-medium text-white">
                {viewMode === "attendance"
                  ? "Attended"
                  : "Expected Attendance"}
              </td>
              <td />
              <td />
              <td />
              <td />
              <td />
              {hasGroupColumn && <td />}
              {programmeEvents.map((pe) => (
                <td
                  key={pe.id}
                  className="text-center py-3 px-2 font-medium text-white"
                >
                  {viewMode === "attendance"
                    ? getEventPresentCount(pe.eventId)
                    : getEventAttendanceCount(pe.eventId)}
                </td>
              ))}
              <td />
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {programmeEvents.length > 0 && (
        <div className="mt-8">
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <h3 className="text-sm font-semibold text-white">
              Expected vs attended
            </h3>
            <div className="text-sm">
              <span className="text-white font-semibold">{totalAttended}</span>
              <span className="text-muted"> / {totalExpected} attended</span>
              {overallRate !== null && (
                <span className={`ml-2 font-semibold ${rateColor(overallRate)}`}>
                  {overallRate}%
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-muted mb-3">
            Expected = players who said they were available
            {filtersActive ? " (within the current filters)" : ""}; attended =
            marked present.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {programmeEvents.map((pe) => {
              const expected = getEventAttendanceCount(pe.eventId);
              const attended = getEventPresentCount(pe.eventId);
              const rate =
                expected > 0 ? Math.round((attended / expected) * 100) : null;
              return (
                <div
                  key={pe.id}
                  className="p-3 rounded-md border border-border bg-card/30"
                >
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {pe.events?.name}
                      </p>
                      {pe.events?.date && (
                        <p className="text-xs text-muted">
                          {formatDate(pe.events.date)}
                          {eventTimeRange(pe.events)
                            ? ` · ${eventTimeRange(pe.events)}`
                            : ""}
                        </p>
                      )}
                    </div>
                    {rate !== null && (
                      <span
                        className={`text-sm font-semibold shrink-0 ${rateColor(
                          rate,
                        )}`}
                      >
                        {rate}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-end gap-6 mb-2">
                    <div>
                      <p className="text-xs text-muted">Expected</p>
                      <p className="text-lg font-semibold text-white">
                        {expected}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Attended</p>
                      <p className="text-lg font-semibold text-green-500">
                        {attended}
                      </p>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${Math.min(rate ?? 0, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
