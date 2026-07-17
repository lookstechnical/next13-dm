import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { Printer } from "lucide-react";
import { useMemo } from "react";
import { Button } from "~/components/ui/button";
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
import { calculateAgeGroup, formatDate } from "~/utils/helpers";

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
      params.id as string,
    );
    const programmeEvents = await programmeService.getProgrammeEvents(
      params.id as string,
    );
    const registrations = await programmeService.getProgrammeRegistrations(
      params.id as string,
    );
    const availability = await programmeService.getProgrammeEventAvailability(
      params.id as string,
    );
    const playerGroups = await groupService.getGroupsByTeam(
      user.current_team as string,
    );

    return {
      programme,
      programmeEvents,
      registrations,
      availability,
      playerGroups,
    };
  },
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
    (pe) => new Date(pe.events!.date).getTime() >= todayStart.getTime(),
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
}
`;

export default function ProgrammeRegister() {
  const { programme, programmeEvents, registrations, availability, playerGroups } =
    useLoaderData<{
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

  const selectedEvent = programmeEvents.find(
    (pe) => pe.eventId === selectedEventId,
  );

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next, { replace: true, preventScrollReset: true });
  };

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

  const rows = useMemo(() => {
    return registrations
      .filter((reg) => {
        if (groupFilter === ALL_GROUPS) return true;
        const group = playerGroups?.find((g) => g.id === groupFilter);
        return !!group?.playerIds?.includes(reg.players?.id ?? "");
      })
      .map((reg) => {
        const available = availabilityByRegistration.get(reg.id);
        return {
          id: reg.id,
          name: reg.players?.name ?? "Unknown",
          ageGroup: reg.players?.dateOfBirth
            ? calculateAgeGroup(reg.players.dateOfBirth)
            : "Unknown",
          club: reg.players?.club || "-",
          groups: playerIdToGroupNames.get(reg.players?.id ?? "") ?? [],
          available,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [
    registrations,
    groupFilter,
    playerGroups,
    playerIdToGroupNames,
    availabilityByRegistration,
  ]);

  const expected = rows.filter((r) => r.available === true).length;
  const notAvailable = rows.filter((r) => r.available === false).length;
  const noResponse = rows.filter((r) => r.available === undefined).length;

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
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline" className="h-9">
            <Link to={`/dashboard/programmes/${programme.id}`}>Back</Link>
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
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-muted font-medium w-[36px]">
                  #
                </th>
                <th className="text-left py-2 px-2 text-muted font-medium">
                  Player
                </th>
                <th className="text-left py-2 px-2 text-muted font-medium">
                  Age Group
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
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id} className="border-b border-border/50">
                  <td className="py-2 px-2 text-muted">{i + 1}</td>
                  <td className="py-2 px-2 text-white">{row.name}</td>
                  <td className="py-2 px-2 text-muted">{row.ageGroup}</td>
                  <td className="py-2 px-2 text-muted">{row.club}</td>
                  <td className="py-2 px-2 text-muted">
                    {row.groups.length > 0 ? row.groups.join(", ") : "-"}
                  </td>
                  <td className="py-2 px-2">
                    {row.available === true && (
                      <span className="text-green-500">Yes</span>
                    )}
                    {row.available === false && (
                      <span className="text-red-500">No</span>
                    )}
                    {row.available === undefined && (
                      <span className="text-muted">No response</span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <span className="inline-block w-5 h-5 border border-border rounded-sm" />
                  </td>
                </tr>
              ))}
              {Array.from({ length: BLANK_ROWS }, (_, i) => (
                <tr key={`blank-${i}`} className="border-b border-border/50">
                  <td className="py-2 px-2 text-muted">{rows.length + i + 1}</td>
                  <td className="py-2 px-2" />
                  <td className="py-2 px-2" />
                  <td className="py-2 px-2" />
                  <td className="py-2 px-2" />
                  <td className="py-2 px-2" />
                  <td className="py-2 px-2">
                    <span className="inline-block w-5 h-5 border border-border rounded-sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
