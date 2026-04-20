import type { ActionFunction, LoaderFunction, MetaFunction } from "@remix-run/node";
import { redirect, useLoaderData } from "@remix-run/react";
import { ProgrammeForm } from "~/components/forms/form/programme";
import SheetPage from "~/components/sheet-page";
import { EventService } from "~/services/eventService";
import { ProgrammeService } from "~/services/programmeService";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [
    { title: "Edit Programme" },
    { name: "description", content: "Edit Programme" },
  ];
};

export const loader: LoaderFunction = withAuth(
  async ({ params, supabaseClient, user }) => {
    const programmeService = new ProgrammeService(supabaseClient);
    const eventService = new EventService(supabaseClient);

    const programme = await programmeService.getProgrammeById(
      params.id as string
    );
    const programmeEvents = await programmeService.getProgrammeEvents(
      params.id as string
    );
    const events = await eventService.getEventsByTeam(user.team.id);

    const selectedEventIds = programmeEvents.map((pe) => pe.eventId);

    return { programme, events, selectedEventIds };
  }
);

export const action: ActionFunction = withAuthAction(
  async ({ request, supabaseClient }) => {
    const programmeService = new ProgrammeService(supabaseClient);

    const formData = await request.formData();
    const programmeId = formData.get("programmeId") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const registrationDeadline = formData.get("registrationDeadline") as string;
    const status = (formData.get("status") as string) || "upcoming";
    const canRegister = formData.get("canRegister") as string;
    const eventIds = formData.getAll("eventIds") as string[];
    const image = formData.get("image");
    const sectionsRaw = formData.get("sections") as string;
    const sections = sectionsRaw ? JSON.parse(sectionsRaw) : null;
    const availabilityDescription = formData.get("availabilityDescription") as string;
    const eligibleDobFrom = formData.get("eligibleDobFrom") as string;
    const eligibleDobTo = formData.get("eligibleDobTo") as string;

    await programmeService.updateProgramme(programmeId, {
      name,
      description,
      registrationDeadline:
        registrationDeadline !== "" ? registrationDeadline : null,
      status,
      canRegister: canRegister === "on",
      sections,
      availabilityDescription: availabilityDescription || null,
      eligibleDobFrom: eligibleDobFrom || null,
      eligibleDobTo: eligibleDobTo || null,
    });

    if (image && image.size > 0) {
      await programmeService.uploadProgrammeImage(programmeId, image);
    }

    // Sync events: remove all existing, then add selected
    const existingEvents = await programmeService.getProgrammeEvents(programmeId);
    for (const pe of existingEvents) {
      await programmeService.removeEventFromProgramme(programmeId, pe.eventId);
    }
    if (eventIds.length > 0) {
      await programmeService.addEventsToProgramme(programmeId, eventIds);
    }

    return redirect(`/dashboard/programmes/${programmeId}`);
  }
);

export default function EditProgramme() {
  const { programme, events, selectedEventIds } =
    useLoaderData<typeof loader>();

  return (
    <SheetPage
      backLink={`/dashboard/programmes/${programme.id}`}
      title="Edit Programme"
      description="Edit Programme"
      hasForm
      updateButton="Save Programme"
    >
      <ProgrammeForm
        programme={programme}
        events={events}
        selectedEventIds={selectedEventIds}
      />
    </SheetPage>
  );
}
