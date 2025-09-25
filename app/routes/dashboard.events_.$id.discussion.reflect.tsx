import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { ReflectForm } from "~/components/forms/form/reflect";
import SheetPage from "~/components/sheet-page";
import { EventService } from "~/services/eventService";
import { SessionService } from "~/services/sessionService";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = withAuth(
  async ({ params, supabaseClient }) => {
    const eventService = new EventService(supabaseClient);
    const event = await eventService.getEventById(params.id as string);

    return { event };
  }
);

export const action: ActionFunction = withAuthAction(
  async ({ request, params, supabaseClient, user }) => {
    let formData = await request.formData();
    const improve = formData.get("improve") as string;
    const well = formData.get("well") as string;
    const engagement = formData.get("engage") as string;
    const coachEnergy = formData.get("coachEnergy") as string;

    const sessionService = new SessionService(supabaseClient);

    await sessionService.addSessionReflection({
      improve,
      well,
      engagement,
      coach_energy: coachEnergy,
      event_id: params.id,
      coach_id: user.id,
    });

    return {};
  }
);

export default function SessionPlan() {
  const { event } = useLoaderData<typeof loader>();

  return (
    <SheetPage
      backLink={`/dashboard/events/${event.id}/session-plan`}
      title="Coach Reflection"
      description="Add Coach Reflection"
      updateButton="Save Reflection"
      hasForm
    >
      <ReflectForm />
    </SheetPage>
  );
}
