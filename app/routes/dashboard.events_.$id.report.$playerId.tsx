import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import {
  Form,
  Link,
  redirect,
  useLoaderData,
  useNavigate,
} from "@remix-run/react";
import { ReportForm } from "~/components/forms/form/report";
import ActionButton from "~/components/ui/action-button";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
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

  console.log(params);
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

  console.log({ data });

  const report = await reportService.createEventReport(data, user.id);

  if (report) {
    for (const [key, value] of formData.entries()) {
      const match = key.match(/^attribute\[(.+)\]$/);
      if (match) {
        const uuid = match[1];

        reportService.addReportScore(uuid, report.id, value.toString());
      }
    }
  }

  return redirect(`/dashboard/events/${eventId}`);
};

export default function PlayerEventReport() {
  const navigate = useNavigate();
  const { event, template, player } = useLoaderData<typeof loader>();
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          navigate(`/dashboard/events/${event.id}`);
        }
      }}
    >
      <SheetContent className="w-full lg:w-2/3 sm:max-w-[100vw]">
        <SheetHeader className="">
          <SheetTitle>Add Report</SheetTitle>
          <SheetDescription>Add a Report</SheetDescription>
        </SheetHeader>
        <Form method="POST">
          <ReportForm event={event} template={template} player={player} />

          <SheetFooter className="absolute bottom-0 w-full p-10 flex flex-row gap-2">
            <Button asChild variant="link">
              <Link to={`/dashboard/events/${event.id}`}>Cancel</Link>
            </Button>

            <ActionButton title="Add Report" />
          </SheetFooter>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
