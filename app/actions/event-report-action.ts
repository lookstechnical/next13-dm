import { ActionFunction, redirect } from "react-router";
import { PlayerReport } from "../types";
import { getUser } from "../loaders/user";
import { reportService } from "../services/reportService";

export const eventReportAction: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  const { currentUser } = await getUser();

  const eventId = formData.get("eventId") as string;

  const data: Omit<PlayerReport, "id" | "scoutId" | "createdAt" | "matchId"> = {
    position: formData.get("position") as string,
    suggestedPosition: formData.get("suggestedPosition") as string,
    notes: formData.get("notes") as string,
    playerId: formData.get("playerId") as string,
    templateId: formData.get("templateId") as string,
    eventId,
  };

  console.log({ data });

  const report = await reportService.createEventReport(data, currentUser.id);

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
