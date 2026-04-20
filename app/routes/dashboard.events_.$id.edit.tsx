import type { ActionFunction, LoaderFunction, MetaFunction } from "@remix-run/node";
import { redirect, useLoaderData } from "@remix-run/react";
import { EventForm } from "~/components/forms/form/event";
import SheetPage from "~/components/sheet-page";
import { EventService } from "~/services/eventService";
import { TemplateService } from "~/services/templateService";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [
    { title: "Edit Event" },
    { name: "description", content: "Edit Event" },
  ];
};

export const loader: LoaderFunction = withAuth(
  async ({ params, supabaseClient }) => {
    const eventService = new EventService(supabaseClient);
    const templateService = new TemplateService(supabaseClient);

    const event = await eventService.getEventById(params.id as string);
    const templates = await templateService.getAllTemplates();

    return { event, templates };
  }
);

export const action: ActionFunction = withAuthAction(
  async ({ request, params, supabaseClient }) => {
    const eventService = new EventService(supabaseClient);

    const formData = await request.formData();
    const name = formData.get("name") as string;
    const date = formData.get("date") as string;
    const location = formData.get("location") as string;
    const registrationDeadline = formData.get("registrationDeadline") as string;
    const description = formData.get("description") as string;
    const eventType = formData.get("event-type") as string;
    const canRegister = formData.get("canRegister") as string;

    await eventService.updateEvent(params.id as string, {
      name,
      date,
      location,
      description,
      registrationDeadline:
        registrationDeadline !== "" ? registrationDeadline : null,
      eventType,
      canRegister: canRegister === "on",
    });

    return redirect(`/dashboard/events/${params.id}`);
  }
);

export default function EditEvent() {
  const { event, templates } = useLoaderData<typeof loader>();

  return (
    <SheetPage
      backLink={`/dashboard/events/${event.id}`}
      title="Edit Event"
      description="Edit Event"
      hasForm
      updateButton="Save Event"
    >
      <EventForm event={event} templates={templates} />
    </SheetPage>
  );
}
