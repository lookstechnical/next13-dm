import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { redirect, useLoaderData } from "@remix-run/react";
import { EventForm } from "~/components/forms/form/event";
import SheetPage from "~/components/sheet-page";
import { getSupabaseServerClient } from "~/lib/supabase";
import { EventService } from "~/services/eventService";
import { TemplateService } from "~/services/templateService";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = withAuth(async ({ supabaseClient }) => {
  const templateService = new TemplateService(supabaseClient);
  const templates = await templateService.getAllTemplates();

  return { templates };
});

export const action: ActionFunction = withAuthAction(
  async ({ request, supabaseClient, user }) => {
    const eventsService = new EventService(supabaseClient);

    let formData = await request.formData();
    const name = formData.get("name") as string;
    const date = formData.get("date") as string;
    const location = formData.get("location") as string;
    const registrationDeadline = formData.get("registrationDeadline");
    const description = formData.get("description") as string;
    const eventType = formData.get("event-type") as string;
    const canRegister = formData.get("canRegister") as string;

    const templateId = formData.get("templateId") as string;

    const data = {
      name,
      date,
      location,
      description,
      registrationDeadline:
        registrationDeadline !== "" ? registrationDeadline : null,
      teamId: user.current_team,
      status: "upcoming",
      ageGroup: "non",
      templateId: templateId,
      eventType,
      canRegister,
    };

    await eventsService.createEvent(data, user.id);

    return redirect("/dashboard/events");
  }
);

export default function AddEvent() {
  const { templates } = useLoaderData<typeof loader>();

  return (
    <SheetPage
      backLink="/dashboard/events"
      title="Add Event"
      description="Add a new Event"
      hasForm
      updateButton="Add Event"
    >
      <EventForm templates={templates} />
    </SheetPage>
  );
}
