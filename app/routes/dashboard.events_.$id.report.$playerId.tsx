import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { redirect, useLoaderData } from "@remix-run/react";
import { ReportForm } from "~/components/forms/form/report";
import SheetPage from "~/components/sheet-page";
import { getSupabaseServerClient } from "~/lib/supabase";
import { EventService } from "~/services/eventService";
import { PlayerService } from "~/services/playerService";
import { ReportService } from "~/services/reportService";
import { TemplateService } from "~/services/templateService";
import { PlayerReport } from "~/types";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [
    { title: "Add Event" },
    { name: "description", content: "Add Event" },
  ];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const eventService = new EventService(supabaseClient);
  const templateService = new TemplateService(supabaseClient);
  const playerService = new PlayerService(supabaseClient);

  const event = params.id
    ? await eventService.getEventById(params.id)
    : undefined;

  const player = params.playerId
    ? await playerService.getPlayerById(params.playerId)
    : undefined;

  const template = event?.templateId
    ? await templateService.getTemplateById(event.templateId as string)
    : undefined;

  return { event, template, player };
};

export const action: ActionFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const reportService = new ReportService(supabaseClient);

  const { user: authUser } = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.id, supabaseClient);

  if (!user) {
    return redirect("/");
  }

  let formData = await request.formData();
  const notes = formData.get("notes") as string;
  const eventId = params.id as string;
  const templateId = formData.get("templateId") as string;
  const playerId = params.playerId as string;

  const position = formData.get("position") as string;
  const suggestedPosition = formData.get("suggestedPosition") as string;

  const data: Omit<PlayerReport, "id" | "scoutId" | "createdAt" | "matchId"> & {
    eventId: string;
  } = {
    notes,
    playerId,
    eventId,
    position,
    suggestedPosition,
    templateId,
  };

  const report = await reportService.createEventReport(data, user.id);

  if (report) {
    for (const [key, value] of formData.entries()) {
      const match = key.match(/^attribute\[(.+)\]$/);
      if (match) {
        const uuid = match[1];

        await reportService.addReportScore(uuid, report.id, value.toString());
      }
    }
  }

  await reportService.refreshAverageScores(playerId);

  return redirect(`/dashboard/events/${eventId}`);
};

export default function PlayerEventReport() {
  const { event, template, player } = useLoaderData<typeof loader>();
  return (
    <SheetPage
      backLink={`/dashboard/events/${event.id}`}
      title="Add Report"
      description="Add Report"
      updateButton="Add Report"
      hasForm
    >
      <ReportForm event={event} template={template} player={player} />
    </SheetPage>
  );
}
