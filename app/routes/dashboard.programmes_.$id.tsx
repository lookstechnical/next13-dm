import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import {
  Link,
  Outlet,
  redirect,
  useLoaderData,
  useLocation,
} from "@remix-run/react";
import { Calendar, Clock, MapPin, MoreVertical } from "lucide-react";
import { DeleteConfirm } from "~/components/forms/delete-confirm";
import { AddPlayerDialog } from "~/components/programmes/add-player-dialog";
import { AttendanceOverview } from "~/components/programmes/attendance-overview";
import { RegistrationAllowlist } from "~/components/programmes/registration-allowlist";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { GroupService } from "~/services/groupService";
import { PlayerService } from "~/services/playerService";
import { TeamService } from "~/services/teamService";
import {
  ProgrammeFullError,
  ProgrammeService,
} from "~/services/programmeService";
import { ActionProtection } from "~/components/action-protection";
import { AllowedRoles } from "~/components/route-protections";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";
import {
  bibSetsFromTeam,
  isBibColorId,
  nextFreeBib,
} from "~/utils/bibs";
import {
  eventTimeRange,
  formatDate,
  registrationDeadlinePassed,
} from "~/utils/helpers";
import {
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [
    { title: "Programme Detail" },
    { name: "description", content: "Programme Detail" },
  ];
};

export const loader: LoaderFunction = withAuth(
  async ({ params, supabaseClient, user }) => {
    const programmeService = new ProgrammeService(supabaseClient);
    const groupService = new GroupService(supabaseClient);
    const playerService = new PlayerService(supabaseClient);

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
    const attendance = await programmeService.getProgrammeEventAttendance(
      params.id as string,
    );
    const playerGroups = await groupService.getGroupsByTeam(
      user.current_team as string,
    );
    const allowedEmails = await programmeService.getAllowedEmails(
      params.id as string,
    );
    const teamService = new TeamService(supabaseClient);
    const bibSets = bibSetsFromTeam(
      (await teamService.getTeamById(user.current_team as string)) as Parameters<
        typeof bibSetsFromTeam
      >[0],
    );

    // Players in the programme's team who aren't already registered — offered
    // in the "Add player" dialog so staff can register an existing player.
    const registeredPlayerIds = new Set(
      registrations
        .map((r: any) => r.playerId || r.players?.id)
        .filter(Boolean),
    );
    const teamPlayers = programme?.teamId
      ? await playerService.getPlayersByTeam(programme.teamId)
      : [];
    const availablePlayers = teamPlayers.filter(
      (p) => !registeredPlayerIds.has(p.id),
    );

    return {
      programme,
      availablePlayers,
      programmeEvents,
      registrations,
      availability,
      attendance,
      playerGroups,
      allowedEmails,
      bibSets,
      user,
    };
  },
);

export const action: ActionFunction = withAuthAction(
  async ({ request, params, supabaseClient, user }) => {
    const programmeService = new ProgrammeService(supabaseClient);
    const groupService = new GroupService(supabaseClient);
    const formData = await request.formData();

    if (request.method === "DELETE") {
      const programmeId = formData.get("id") as string;
      await programmeService.deleteProgramme(programmeId);
      return redirect("/dashboard/programmes");
    }

    const intent = formData.get("intent") as string;

    if (intent === "removeRegistration") {
      const registrationId = formData.get("registrationId") as string;
      await programmeService.removeRegistration(registrationId);
      return { ok: true };
    }

    if (intent === "registerExistingPlayer") {
      const programmeId = formData.get("programmeId") as string;
      const playerId = formData.get("playerId") as string;
      if (!programmeId || !playerId) {
        return { error: "Missing player or programme." };
      }

      // Don't double-register: a player can only appear on a programme once.
      const existing = await programmeService.getPlayerProgrammeRegistration(
        playerId,
        programmeId,
      );
      if (existing) return { ok: true };

      const playerService = new PlayerService(supabaseClient);
      const player = await playerService.getPlayerById(playerId);

      // Default availability to "available" for every event, matching the
      // self-registration default; staff can adjust it afterwards.
      const programmeEvents =
        await programmeService.getProgrammeEvents(programmeId);
      const eventAvailability = programmeEvents.map((pe) => ({
        eventId: pe.eventId,
        available: true,
      }));

      try {
        await programmeService.registerForProgramme({
          programmeId,
          playerId,
          email: player?.email,
          eventAvailability,
        });
      } catch (error) {
        // Staff are held to the cap too — it's the same number of places. The
        // way to add more is to raise the limit, which keeps one source of
        // truth rather than letting the dashboard quietly exceed it.
        if (error instanceof ProgrammeFullError) {
          return {
            error:
              "This programme is full. Raise the registration limit on the programme settings to add more players.",
          };
        }
        throw error;
      }
      return { ok: true };
    }

    if (intent === "setAttendance") {
      const registrationId = formData.get("registrationId") as string;
      const eventId = formData.get("eventId") as string;
      const value = formData.get("attended") as string; // present | absent | unset
      const attended =
        value === "present" ? true : value === "absent" ? false : null;
      await programmeService.setEventAttendance({
        registrationId,
        eventId,
        attended,
      });
      return { ok: true };
    }

    if (intent === "setAvailability") {
      const registrationId = formData.get("registrationId") as string;
      const playerId = formData.get("playerId") as string;
      const eventId = formData.get("eventId") as string;
      const value = formData.get("available") as string; // available | unavailable | unset
      const available =
        value === "available" ? true : value === "unavailable" ? false : null;
      await programmeService.setEventAvailability({
        registrationId,
        playerId,
        eventId,
        available,
      });
      return { ok: true };
    }

    if (intent === "setBib") {
      const registrationId = formData.get("registrationId") as string;
      const color = String(formData.get("bibColor") ?? "");
      const bibColor = isBibColorId(color) ? color : null;
      const number = Number(String(formData.get("bibNumber") ?? "").trim());
      let bibNumber = Number.isInteger(number) && number > 0 ? number : null;

      // Picking a colour hands out the next bib of it still in the bag. Worked
      // out here rather than in the browser so a coach going quickly down the
      // list gets numbers from what's saved, not from a page that hasn't
      // caught up with their last pick.
      if (bibColor && formData.get("autoNumber") === "1") {
        const teamService = new TeamService(supabaseClient);
        const bibSets = bibSetsFromTeam(
          (await teamService.getTeamById(
            user.current_team as string,
          )) as Parameters<typeof bibSetsFromTeam>[0],
        );
        const registrations = await programmeService.getProgrammeRegistrations(
          params.id as string,
        );
        const taken = new Set(
          registrations
            .filter(
              (r) =>
                r.id !== registrationId &&
                r.bibColor === bibColor &&
                !!r.bibNumber,
            )
            .map((r) => r.bibNumber as number),
        );
        bibNumber = nextFreeBib(bibSets[bibColor], taken);
        await programmeService.setRegistrationBib({
          registrationId,
          bibColor,
          bibNumber,
        });
        return { ok: true, bibSetFull: bibNumber === null };
      }

      await programmeService.setRegistrationBib({
        registrationId,
        bibColor,
        bibNumber,
      });
      return { ok: true };
    }

    if (intent === "assignToGroup") {
      const groupId = formData.get("groupId") as string;
      const playerId = formData.get("playerId") as string;
      await groupService.setPlayerGroup(groupId, playerId);
      return { ok: true };
    }

    if (intent === "addAllowedEmail") {
      const programmeId = formData.get("id") as string;
      const email = formData.get("email") as string;
      if (email?.trim()) {
        await programmeService.addAllowedEmail(programmeId, email);
      }
      return { ok: true };
    }

    if (intent === "removeAllowedEmail") {
      const allowedEmailId = formData.get("allowedEmailId") as string;
      await programmeService.removeAllowedEmail(allowedEmailId);
      return { ok: true };
    }

    return null;
  },
);

export default function ProgrammeDetail() {
  const {
    programme,
    programmeEvents,
    registrations,
    availability,
    attendance,
    playerGroups,
    allowedEmails,
    availablePlayers,
    bibSets,
    user,
  } = useLoaderData<typeof loader>();
  // Sheets open over the list, so they carry its filters along and hand them
  // back when closed.
  const { search } = useLocation();

  if (!programme) {
    return (
      <div className="container px-4 mx-auto py-10 text-foreground">
        <p>Programme not found.</p>
      </div>
    );
  }

  return (
    <div className="container px-4 mx-auto py-10 text-foreground">
      <div className="flex flex-col md:flex-row justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">{programme.name}</h1>
            <Badge variant="outline" className="uppercase text-xs">
              {programme.status}
            </Badge>
          </div>
          {programme.description && (
            <div
              className="tiptap text-muted mb-2"
              dangerouslySetInnerHTML={{ __html: programme.description }}
            />
          )}
          {programme.registrationDeadline && (
            <p className="text-sm text-muted">
              Registration deadline:{" "}
              {formatDate(programme.registrationDeadline)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-full border-none hover:bg-transparent text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 flex flex-col">
              <Button asChild variant="outline">
                <Link to="/dashboard/programmes">Back</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={`/dashboard/programmes/${programme.id}/register`}>
                  Print Register
                </Link>
              </Button>
              <ActionProtection
                allowedRoles={AllowedRoles.adminOnly}
                user={user}
              >
                <Button asChild variant="outline">
                  <Link to={`/dashboard/programmes/${programme.id}/send-email${search}`}>
                    Email Members
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to={`/dashboard/programmes/${programme.id}/invite${search}`}>
                    Invite Members
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to={`/dashboard/programmes/${programme.id}/reminder${search}`}>
                    Send reminder
                  </Link>
                </Button>
              </ActionProtection>
              <Button asChild variant="outline">
                <Link to={`/dashboard/programmes/${programme.id}/edit${search}`}>
                  Edit
                </Link>
              </Button>
              <DeleteConfirm name={programme.name} id={programme.id}>
                <Button className="" variant="destructive">
                  Delete
                </Button>
              </DeleteConfirm>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {programme.imageUrl && (
        <img
          src={programme.imageUrl}
          alt={programme.name}
          className="w-full max-w-xl aspect-video object-cover rounded-lg mb-8"
        />
      )}

      <h2 className="text-xl font-semibold text-white mb-4">
        Events ({programmeEvents.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
        {programmeEvents.map((pe: any) => (
          <Card key={pe.id} className="border-border p-4">
            <h3 className="text-md font-medium text-white">
              {pe.events?.name}
            </h3>
            <div className="flex flex-col gap-1 mt-1">
              {pe.events?.date && (
                <p className="text-sm text-muted flex items-center gap-1">
                  <Calendar className="w-4" />
                  {formatDate(pe.events.date)}
                </p>
              )}
              {eventTimeRange(pe.events) && (
                <p className="text-sm text-muted flex items-center gap-1">
                  <Clock className="w-4" />
                  {eventTimeRange(pe.events)}
                </p>
              )}
              {pe.events?.location && (
                <p className="text-sm text-muted flex items-center gap-1">
                  <MapPin className="w-3" />
                  {pe.events.location}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold text-white">
          Registration allow-list ({allowedEmails.length})
        </h2>
        {registrationDeadlinePassed(programme.registrationDeadline) && (
          <Badge variant="outline" className="uppercase text-xs">
            Closed
          </Badge>
        )}
      </div>
      <Card className="border-border p-4 mb-10">
        <RegistrationAllowlist
          programmeId={programme.id}
          allowedEmails={allowedEmails}
          deadlinePassed={registrationDeadlinePassed(
            programme.registrationDeadline,
          )}
        />
      </Card>

      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex flex-row items-baseline gap-3">
          <h2 className="text-xl font-semibold text-white">
            Registrations ({registrations.length}
            {programme.maxRegistrations
              ? ` of ${programme.maxRegistrations}`
              : ""}
            )
          </h2>
          {programme.maxRegistrations &&
            registrations.length >= programme.maxRegistrations && (
              <Badge variant="outline" className="border-destructive">
                Full
              </Badge>
            )}
        </div>
        <AddPlayerDialog
          programmeId={programme.id}
          availablePlayers={availablePlayers}
        />
      </div>
      <Card className="border-border p-4">
        <AttendanceOverview
          registrations={registrations}
          programmeEvents={programmeEvents}
          availability={availability}
          attendance={attendance}
          playerGroups={playerGroups}
          bibSets={bibSets}
        />
      </Card>
      <Outlet />
    </div>
  );
}
