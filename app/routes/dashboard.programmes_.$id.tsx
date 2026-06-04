import type { ActionFunction, LoaderFunction, MetaFunction } from "@remix-run/node";
import { Link, Outlet, redirect, useLoaderData } from "@remix-run/react";
import { Calendar, MapPin } from "lucide-react";
import { DeleteConfirm } from "~/components/forms/delete-confirm";
import { AttendanceOverview } from "~/components/programmes/attendance-overview";
import { RegistrationAllowlist } from "~/components/programmes/registration-allowlist";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { GroupService } from "~/services/groupService";
import { ProgrammeService } from "~/services/programmeService";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";
import { formatDate, registrationDeadlinePassed } from "~/utils/helpers";

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
    const allowedEmails = await programmeService.getAllowedEmails(
      params.id as string
    );

    return {
      programme,
      programmeEvents,
      registrations,
      availability,
      playerGroups,
      allowedEmails,
      user,
    };
  }
);

export const action: ActionFunction = withAuthAction(
  async ({ request, supabaseClient }) => {
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
  }
);

export default function ProgrammeDetail() {
  const {
    programme,
    programmeEvents,
    registrations,
    availability,
    playerGroups,
    allowedEmails,
  } = useLoaderData<typeof loader>();

  if (!programme) {
    return (
      <div className="container px-4 mx-auto py-10 text-foreground">
        <p>Programme not found.</p>
      </div>
    );
  }

  return (
    <div className="container px-4 mx-auto py-10 text-foreground">
      <div className="flex flex-row justify-between items-start mb-6">
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
          <Button asChild variant="outline">
            <Link to="/dashboard/programmes">Back</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`/dashboard/programmes/${programme.id}/edit`}>Edit</Link>
          </Button>
          <DeleteConfirm
            name={programme.name}
            id={programme.id}
          />
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
            programme.registrationDeadline
          )}
        />
      </Card>

      <h2 className="text-xl font-semibold text-white mb-4">
        Registrations ({registrations.length})
      </h2>
      <Card className="border-border p-4">
        <AttendanceOverview
          registrations={registrations}
          programmeEvents={programmeEvents}
          availability={availability}
          playerGroups={playerGroups}
        />
      </Card>
      <Outlet />
    </div>
  );
}
