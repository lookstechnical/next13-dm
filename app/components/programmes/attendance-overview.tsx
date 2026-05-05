import { Form, useFetcher } from "@remix-run/react";
import {
  PlayerGroup,
  ProgrammeRegistration,
  ProgrammeEventAvailability,
  ProgrammeEvent,
} from "~/types";
import { calculateAgeGroup, formatDate } from "~/utils/helpers";
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

const PlayerRow: React.FC<{
  reg: ProgrammeRegistration;
  programmeEvents: ProgrammeEvent[];
  getAvailability: (registrationId: string, eventId: string) => boolean | undefined;
  playerGroups?: PlayerGroup[];
}> = ({ reg, programmeEvents, getAvailability, playerGroups }) => {
  const fetcher = useFetcher();
  const ageGroup = reg.players?.dateOfBirth
    ? calculateAgeGroup(reg.players.dateOfBirth)
    : "Unknown";

  const handleGroupAssign = (groupId: string) => {
    if (!reg.players?.id) return;
    fetcher.submit(
      { intent: "assignToGroup", groupId, playerId: reg.players.id },
      { method: "post" }
    );
  };

  // Filter out groups the player is already in
  const availableGroups = playerGroups?.filter(
    (g) => !g.playerIds?.includes(reg.players?.id || "")
  );

  return (
    <tr className="border-b border-border/50">
      <td className="py-3 px-2">
        <div className="flex items-center gap-2">
          {reg.players?.photoUrl && (
            <img
              src={reg.players.photoUrl}
              alt={reg.players.name}
              className="w-8 h-8 rounded-full object-cover"
            />
          )}
          <span className="text-white">{reg.players?.name}</span>
        </div>
      </td>
      <td className="py-3 px-2">
        <span className="text-xs text-muted">{ageGroup}</span>
      </td>
      <td className="py-3 px-2">
        <span className="text-xs text-white">{reg.players?.position || "-"}</span>
      </td>
      <td className="py-3 px-2">
        <span className="text-xs text-muted">
          {reg.players?.secondaryPosition || "-"}
        </span>
      </td>
      {playerGroups && playerGroups.length > 0 && (
        <td className="py-3 px-2">
          {availableGroups && availableGroups.length > 0 ? (
            <Select onValueChange={handleGroupAssign}>
              <SelectTrigger className="h-8 text-xs w-full text-foreground border-input">
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent className="text-foreground">
                <SelectGroup>
                  <SelectLabel className="text-foreground">Groups</SelectLabel>
                  {availableGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id} className="text-foreground">
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : (
            <span className="text-xs text-muted">In all groups</span>
          )}
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
            {isAvailable === undefined && (
              <span className="text-muted">-</span>
            )}
          </td>
        );
      })}
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
              if (!confirm(`Remove ${reg.players?.name} from this programme?`)) {
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
  const getAvailability = (
    registrationId: string,
    eventId: string
  ): boolean | undefined => {
    const record = availability.find(
      (a) =>
        a.programmeRegistrationId === registrationId && a.eventId === eventId
    );
    return record?.available;
  };

  const getEventAttendanceCount = (eventId: string): number => {
    return availability.filter((a) => a.eventId === eventId && a.available)
      .length;
  };

  if (registrations.length === 0) {
    return (
      <div className="text-center py-10 text-muted">
        <p>No registrations yet.</p>
      </div>
    );
  }

  return (
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
            {playerGroups && playerGroups.length > 0 && (
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
            <th className="text-center py-3 px-2 text-muted font-medium w-[60px]" />
          </tr>
        </thead>
        <tbody>
          {registrations.map((reg) => (
            <PlayerRow
              key={reg.id}
              reg={reg}
              programmeEvents={programmeEvents}
              getAvailability={getAvailability}
              playerGroups={playerGroups}
            />
          ))}
          <tr className="border-t border-border">
            <td className="py-3 px-2 font-medium text-white">
              Expected Attendance
            </td>
            <td />
            <td />
            <td />
            {playerGroups && playerGroups.length > 0 && <td />}
            {programmeEvents.map((pe) => (
              <td
                key={pe.id}
                className="text-center py-3 px-2 font-medium text-white"
              >
                {getEventAttendanceCount(pe.eventId)}
              </td>
            ))}
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
};
