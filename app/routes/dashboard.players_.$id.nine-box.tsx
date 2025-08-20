import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { Form, redirect, useLoaderData, useNavigate } from "@remix-run/react";
import { NineBoxForm } from "~/components/forms/form/nine-box";
import ActionButton from "~/components/ui/action-button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetTitle,
} from "~/components/ui/sheet";
import { getSupabaseServerClient } from "~/lib/supabase";
import { ReportService } from "~/services/reportService";
import { TeamService } from "~/services/teamService";
import { TemplateService } from "~/services/templateService";
import { PlayerReport } from "~/types";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  // const;
  const { supabaseClient } = getSupabaseServerClient(request);
  const reportService = new ReportService(supabaseClient);
  const templateService = new TemplateService(supabaseClient);

  const { user: authUser } = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.id, supabaseClient);

  if (!user) {
    return redirect("/");
  }

  let template;
  let report;
  if (user?.team?.progresTemplateId) {
    template = await templateService.getTemplateById(
      user?.team?.progresTemplateId as string
    );

    report = await reportService.getNineBoxReport(
      params.id as string,
      user?.team?.progresTemplateId as string
    );
  }

  console.log({ report });

  return { report, template, player: { id: params.id } };
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
  const templateId = formData.get("templateId") as string;
  const playerId = params.id as string;
  const reportId = formData.get("reportId") as string;

  const data: Omit<
    PlayerReport,
    | "id"
    | "scoutId"
    | "createdAt"
    | "matchId"
    | "position"
    | "suggestedPosition"
    | "reportScores"
    | "notes"
    | "eventId"
  > & {
    eventId: string;
  } = {
    playerId,
    templateId,
  };

  let report;
  if (reportId) {
    report = { id: reportId };
    await reportService.removeReportScores(reportId);
  } else {
    report = await reportService.createPlayerReport(data, user.id);
  }

  if (report) {
    for (const [key, value] of formData.entries()) {
      const match = key.match(/^attribute\[(.+)\]$/);
      if (match) {
        const uuid = match[1];

        await reportService.addReportScore(uuid, report.id, value.toString());
      }
    }

    await reportService.refreshTeamProgress(user.current_team as string);
  }

  return redirect(`/dashboard/players/${playerId}`);
};

export default function PlayerPage() {
  const navigate = useNavigate();
  const { report, template, player } = useLoaderData<typeof loader>();

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          navigate(`/dashboard/players/${player.id}`);
        }
      }}
    >
      <SheetContent className="w-full lg:w-2/3 sm:max-w-[100vw] gap-10 flex flex-col">
        <SheetTitle>9 Box Grid</SheetTitle>
        <Form method="post" encType="multipart/form-data">
          <NineBoxForm player={player} template={template} report={report} />

          <SheetFooter>
            <ActionButton title="Save" />
          </SheetFooter>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
