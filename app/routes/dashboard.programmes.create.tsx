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
    { title: "Add Programme" },
    { name: "description", content: "Add Programme" },
  ];
};

export const loader: LoaderFunction = withAuth(
  async ({ supabaseClient, user }) => {
    const eventService = new EventService(supabaseClient);
    const events = await eventService.getEventsByTeam(user.team.id);

    return { events };
  }
);

export const action: ActionFunction = withAuthAction(
  async ({ request, supabaseClient, user }) => {
    const programmeService = new ProgrammeService(supabaseClient);

    let formData = await request.formData();
    const name = formData.get("name") as string;
    const url = formData.get("url") as string;
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
    // Unticked boxes post nothing, so an empty list legitimately means "ask
    // for nothing extra" rather than "field missing".
    const requestedFields = formData.getAll("requestedFields") as string[];
    // Intersected with requestedFields by parseRequiredFields on read, so a
    // stale key here can never enforce a field the form doesn't render.
    const requiredFields = formData.getAll("requiredFields") as string[];
    // Blank means "no limit", which is null rather than 0 — a zero cap would
    // be a second way of saying can_register = false.
    const maxRegistrationsRaw = (
      (formData.get("maxRegistrations") as string) || ""
    ).trim();
    const maxRegistrations = maxRegistrationsRaw
      ? Number(maxRegistrationsRaw)
      : null;

    const data = {
      name,
      url: url || null,
      description,
      registrationDeadline:
        registrationDeadline !== "" ? registrationDeadline : null,
      teamId: user.current_team,
      status,
      canRegister: canRegister === "on",
      sections,
      availabilityDescription: availabilityDescription || null,
      eligibleDobFrom: eligibleDobFrom || null,
      eligibleDobTo: eligibleDobTo || null,
      requestedFields,
      requiredFields,
      maxRegistrations:
        maxRegistrations && maxRegistrations > 0 ? maxRegistrations : null,
      createdBy: user.id,
    };

    const programme = await programmeService.createProgramme(data, user.id);

    if (image && image.size > 0) {
      await programmeService.uploadProgrammeImage(programme.id, image);
    }

    if (eventIds.length > 0) {
      await programmeService.addEventsToProgramme(programme.id, eventIds);
    }

    return redirect("/dashboard/programmes");
  }
);

export default function AddProgramme() {
  const { events } = useLoaderData<typeof loader>();

  return (
    <SheetPage
      backLink="/dashboard/programmes"
      title="Add Programme"
      description="Add a new Programme"
      hasForm
      updateButton="Add Programme"
    >
      <ProgrammeForm events={events} />
    </SheetPage>
  );
}
