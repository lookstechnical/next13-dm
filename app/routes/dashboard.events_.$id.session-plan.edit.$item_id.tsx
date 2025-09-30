import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { redirect, useLoaderData } from "@remix-run/react";
import { LibraryItemForm } from "~/components/forms/form/lirary-item";
import SheetPage from "~/components/sheet-page";
import { EventService } from "~/services/eventService";
import { SessionService } from "~/services/sessionService";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = withAuth(
  async ({ params, supabaseClient, user }) => {
    const eventService = new EventService(supabaseClient);
    const sessionService = new SessionService(supabaseClient);

    const event = params.id
      ? await eventService.getEventById(params.id)
      : undefined;

    const item = params.item_id
      ? await sessionService.getSessionItemsById(params.item_id)
      : undefined;

    return { event, user, item };
  }
);

export const action: ActionFunction = withAuthAction(
  async ({ request, params, supabaseClient }) => {
    const sessionService = new SessionService(supabaseClient);

    const formData = await request.formData();

    const drillId = formData.get("drillId") as string;

    const data = {
      description: formData.get("description") as string,
      assigned_to: formData.get("assignedTo") as string,
      duration: formData.get("duration") as string,
      drill_id: drillId !== "" ? drillId : undefined,
      type: formData.get("type") as string,
      event_id: params.id,
    };

    await sessionService.updateSessionItem(data, params.item_id);

    return redirect(`/dashboard/events/${params.id}/session-plan`);
  }
);

export default function SessionPlan() {
  const { event, item, user } = useLoaderData<typeof loader>();

  return (
    <SheetPage
      backLink={`/dashboard/events/${event.id}/session-plan`}
      title="Update Session Item"
      description="Update Session Item"
      updateButton="Update Session Item"
      hasForm
    >
      <LibraryItemForm item={item} />
    </SheetPage>
  );
}
