import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { Form, Link, Outlet, redirect, useLoaderData } from "@remix-run/react";
import { DeleteIcon, Edit2Icon, User } from "lucide-react";
import RadarAttributes from "~/components/charts/radar";
import { MoreActions } from "~/components/layout/more-actions";
import { ProgressCard } from "~/components/progress/progress-card";
import { ReportCard } from "~/components/reports/report-card";
import { Button } from "~/components/ui/button copy";
import { DropdownMenuItem } from "~/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { getSupabaseServerClient } from "~/lib/supabase";
import { cn } from "~/lib/utils";
import { PlayerService } from "~/services/playerService";
import { ReportService } from "~/services/reportService";
import { PlayerReport } from "~/types";
import {
  calculateAgeGroup,
  calculateRelativeAgeQuartile,
} from "~/utils/helpers";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  // const;
  const { supabaseClient } = getSupabaseServerClient(request);
  const playerService = new PlayerService(supabaseClient);
  const reportService = new ReportService(supabaseClient);

  const { user: authUser } = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.id, supabaseClient);

  if (!user) {
    return redirect("/");
  }

  const player = await playerService.getPlayerById(params.id as string);

  let reports = [];
  if (user.role === "ADMIN" || user?.role === "HEAD_OF_DEPARTMENT") {
    reports = await reportService.getReportsByPlayer(
      params.id as string,
      undefined,
      undefined,
      user?.team?.progresTemplateId as string
    );
  } else {
    reports = await reportService.getReportsByPlayer(
      params.id as string,
      user.id,
      undefined,
      user?.team?.progresTemplateId as string
    );
  }

  let progress;
  let teamProgress;

  if (user?.team?.progresTemplateId) {
    progress = await reportService.getProgressByPlayer(
      params.id as string,
      user?.team?.progresTemplateId as string
    );
    teamProgress = await reportService.getTeamProgressAvg(
      user.current_team as string
    );
  }

  return {
    player,
    reports,
    progress,
    teamProgress,
    hasProgressTemplate: !!user?.team?.progresTemplateId,
  };
};

export const action: ActionFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const playerService = new PlayerService(supabaseClient);
  let formData = await request.formData();

  const playerId = formData.get("playerId");

  if (playerId) {
    await playerService.deletePlayer(playerId as string);
  }

  return redirect("/dashboard/players");
};

export default function PlayerPage() {
  const { player, reports, progress, teamProgress, hasProgressTemplate } =
    useLoaderData<typeof loader>();

  return (
    <>
      <div className="w-full flex flex-col gap-12 space-y-10 container px-4 mx-auto py-10 text-foreground">
        <div className="w-full flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 gap-4 ">
          <div className="flex flex-col lg:flex-row gap-4 w-full lg:w-1/2 items-center">
            <div className="relative w-[130px] h-[130px] flex items-center justify-center overflow-hidden rounded-full object-cover bg-white">
              {player?.photoUrl ? (
                <img
                  className="w-full object-fit h-full a"
                  alt={player.name}
                  src={player.photoUrl}
                />
              ) : (
                <User className="text-background" />
              )}
            </div>
            <div className="flex gap-1 flex-col">
              <h1 className="text-4xl font-bold text-white flex flex-row gap-2 justify-center items-center">
                {player.name}
              </h1>
              <p className="text-xl">{player.club}</p>

              <p>
                <span className="font-bold">{player.position}</span> :
                {player.secondaryPosition}
              </p>
              <div className="flex flex-row gap-2 pt-2">
                <div className="bg-red-600 text-white px-2 py-1 rounded-lg text-xs font-medium">
                  {calculateAgeGroup(player?.dateOfBirth)}
                </div>
                <div
                  className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    calculateRelativeAgeQuartile(player?.dateOfBirth)
                      .quartile === 1 && `bg-red-400 text-red`,
                    calculateRelativeAgeQuartile(player?.dateOfBirth)
                      .quartile === 2 && `bg-orange-400 text-orange`,
                    calculateRelativeAgeQuartile(player?.dateOfBirth)
                      .quartile === 3 && `bg-yellow-400 text-yellow`,
                    calculateRelativeAgeQuartile(player?.dateOfBirth)
                      .quartile === 4 && `bg-green-400 text-green`
                  )}
                  title="Oldest in year group (Sept-Nov births) - potential relative age advantage"
                >
                  {calculateRelativeAgeQuartile(player?.dateOfBirth).label}
                </div>
              </div>
            </div>
          </div>
          <div>
            <MoreActions>
              <DropdownMenuItem asChild>
                <Button
                  asChild
                  variant={"outline"}
                  className="hover:ring-0 hover:outline-0"
                >
                  <Link to={`/dashboard/players/${player.id}/edit`}>
                    <Edit2Icon /> Edit
                  </Link>
                </Button>
              </DropdownMenuItem>

              {hasProgressTemplate && (
                <DropdownMenuItem asChild>
                  <Button
                    asChild
                    variant={"outline"}
                    className="hover:ring-0 hover:outline-0"
                  >
                    <Link to={`/dashboard/players/${player.id}/nine-box`}>
                      Progress Report
                    </Link>
                  </Button>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem asChild>
                <Form
                  method="delete"
                  className="w-full h-full hover:bg-destructive p-0 "
                >
                  <input type="hidden" name="playerId" value={player.id} />
                  <Button variant="destructive" className="w-full">
                    <DeleteIcon /> Delete
                  </Button>
                </Form>
              </DropdownMenuItem>
            </MoreActions>
          </div>
        </div>
      </div>
      <div className="bg-card min-h-screen py-10">
        {progress && (
          <div className="container mx-auto max-w-[90vw]">
            <ProgressCard report={progress} teamProgress={teamProgress} />
          </div>
        )}
        <Tabs defaultValue="reports" className="container mx-auto">
          <TabsList>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          <TabsContent value="reports">
            <div className="gap-4 flex flex-col">
              {reports.map((report: PlayerReport) => (
                <ReportCard report={report} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
        <Outlet />
      </div>
    </>
  );
}
