import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { redirect, useLoaderData } from "@remix-run/react";
import { NineBoxForm } from "~/components/forms/form/nine-box";
import SheetPage from "~/components/sheet-page";

import { ReportService } from "~/services/reportService";
import { TemplateService } from "~/services/templateService";
import { PlayerReport } from "~/types";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = withAuth(
  async ({ params, supabaseClient, user }) => {
    const reportService = new ReportService(supabaseClient);
    const templateService = new TemplateService(supabaseClient);

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

    return { report, template, player: { id: params.id } };
  }
);

export const action: ActionFunction = withAuthAction(
  async ({ request, params, supabaseClient, user }) => {
    const reportService = new ReportService(supabaseClient);

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
  }
);

export default function PlayerPage() {
  const { report, template, player } = useLoaderData<typeof loader>();

  return (
    <SheetPage
      backLink={`/dashboard/players/${player.id}`}
      title="Progress Report"
      description="Progress Report"
      updateButton="Save Report"
      hasForm
    >
      <NineBoxForm player={player} template={template} report={report} />
    </SheetPage>
  );
}
