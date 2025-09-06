import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { redirect, useLoaderData } from "@remix-run/react";
import { ReflectForm } from "~/components/forms/form/reflect";
import { ItemView } from "~/components/session/item-view";
import SheetPage from "~/components/sheet-page";
import { getSupabaseServerClient } from "~/lib/supabase";
import { EventService } from "~/services/eventService";
import { SessionService } from "~/services/sessionService";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const { user: authUser } = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.id, supabaseClient);

  if (!user) {
    return redirect("/");
  }
  const eventService = new EventService(supabaseClient);
  const event = await eventService.getEventById(params.id as string);

  return { event };
};

export const action: ActionFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const { user: authUser } = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.id, supabaseClient);
  if (!user) {
    return redirect("/");
  }

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
};

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
