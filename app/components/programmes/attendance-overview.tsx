import { Form, useFetcher } from "@remix-run/react";
import { useMemo, useState } from "react";
import {
  PlayerGroup,
  ProgrammeRegistration,
  ProgrammeEventAvailability,
  ProgrammeEvent,
} from "~/types";
import { calculateAgeGroup, formatDate } from "~/utils/helpers";
import { POSITION_GROUPS } from "~/utils/position-groups";
import { Check, X, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
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
  playerGroups?: PlayerGroup[];
};

type GroupFilter = "all" | "with" | "without" | string;
type PositionScope = "primary" | "secondary" | "both";
type SortKey =
  | "name"
  | "position"
  | "availability_desc"
  | "availability_asc"
  | "group";

const ALL_VALUE = "__all__";

const PlayerRow: React.FC<{
  reg: ProgrammeRegistration;
  programmeEvents: ProgrammeEvent[];
  getAvailability: (
    registrationId: string,
    eventId: string,
  ) => boolean | undefined;
  playerGroups?: PlayerGroup[];
  totalAvailable: number;
}> = ({
  reg,
  programmeEvents,
  getAvailability,
  playerGroups,
  totalAvailable,
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
        const isAvailable = getAvailability(reg.id, pe.eventId);
        return (
          <td key={pe.id} className="text-center py-3 px-2">
            {isAvailable === true && (
              <Check className="w-4 h-4 text-green-500 mx-auto" />
            )}
            {isAvailable === false && (
              <X className="w-4 h-4 text-red-500 mx-auto" />
            )}
            {isAvailable === undefined && <span className="text-muted">-</span>}
          </td>
        );
      })}
      <td className="text-center py-3 px-2">
        <span className="text-white font-medium">{totalAvailable}</span>
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
  playerGroups,
}) => {
  const [positionFilter, setPositionFilter] = useState<string>(ALL_VALUE);
  const [positionScope, setPositionScope] = useState<PositionScope>("primary");
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>(ALL_VALUE);
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("name");

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

  const ageGroupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of registrations) {
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
      for (const r of registrations) {
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
  }, [registrations, positionScope]);

  const playerIdToRegistration = useMemo(() => {
    const map = new Map<string, ProgrammeRegistration>();
    for (const r of registrations) {
      if (r.players?.id) map.set(r.players.id, r);
    }
    return map;
  }, [registrations]);

  const playerGroupBreakdowns = useMemo(() => {
    if (!playerGroups) return [];
    const order = ["U12", "U13", "U14", "U15", "U16", "U17", "U18", "Senior"];
    return playerGroups
      .map((pg) => {
        const playerIds = pg.playerIds ?? [];
        const total = playerIds.length;
        const breakdown = POSITION_GROUPS.map((g) => {
          let count = 0;
          for (const pid of playerIds) {
            const reg = playerIdToRegistration.get(pid);
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
          const reg = playerIdToRegistration.get(pid);
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
  }, [playerGroups, playerIdToRegistration, positionScope]);

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
      return true;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
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
          return (a.players?.position ?? "").localeCompare(
            b.players?.position ?? "",
          );
        case "group": {
          const aHas =
            (playerIdToGroupIds.get(a.players?.id ?? "")?.length ?? 0) > 0
              ? 0
              : 1;
          const bHas =
            (playerIdToGroupIds.get(b.players?.id ?? "")?.length ?? 0) > 0
              ? 0
              : 1;
          if (aHas !== bHas) return aHas - bHas;
          return (a.players?.name ?? "").localeCompare(b.players?.name ?? "");
        }
        case "name":
        default:
          return (a.players?.name ?? "").localeCompare(b.players?.name ?? "");
      }
    });
    return sorted;
  }, [
    registrations,
    positionFilter,
    positionScope,
    ageGroupFilter,
    groupFilter,
    sortBy,
    availableCountByRegistration,
    playerIdToGroupIds,
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
    groupFilter !== "all" ||
    sortBy !== "name";

  return (
    <div>
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
                  Group (in group first)
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {filtersActive && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => {
              setPositionFilter(ALL_VALUE);
              setPositionScope("primary");
              setAgeGroupFilter(ALL_VALUE);
              setGroupFilter("all");
              setSortBy("name");
            }}
          >
            Clear
          </Button>
        )}

        <div className="ml-auto text-xs text-muted self-center">
          Showing {visibleRegistrations.length} of {registrations.length}
        </div>
      </div>

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
          <p className="text-xs text-muted mb-2">By age group</p>
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
          <p className="text-xs text-muted mb-2">By group</p>
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
                    4 + (hasGroupColumn ? 1 : 0) + programmeEvents.length + 2
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
                  getAvailability={getAvailability}
                  playerGroups={playerGroups}
                  totalAvailable={availableCountByRegistration.get(reg.id) ?? 0}
                />
              ))
            )}
            <tr className="border-t border-border">
              <td className="py-3 px-2 font-medium text-white">
                Expected Attendance
              </td>
              <td />
              <td />
              <td />
              {hasGroupColumn && <td />}
              {programmeEvents.map((pe) => (
                <td
                  key={pe.id}
                  className="text-center py-3 px-2 font-medium text-white"
                >
                  {getEventAttendanceCount(pe.eventId)}
                </td>
              ))}
              <td />
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
