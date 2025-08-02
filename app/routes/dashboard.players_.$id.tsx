import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { Form, Link, Outlet, redirect, useLoaderData } from "@remix-run/react";
import { DeleteIcon, Edit2Icon, User } from "lucide-react";
import { ReportCard } from "~/components/reports/report-card";
import { Button } from "~/components/ui/button copy";
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
    reports = await reportService.getReportsByPlayer(params.id as string);
  } else {
    reports = await reportService.getReportsByPlayer(
      params.id as string,
      user.id
    );
  }
  return { player, reports };
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
  const { player, reports } = useLoaderData<typeof loader>();

  return (
    <>
      <div className="w-full flex flex-col gap-12 space-y-10 container px-4 mx-auto py-10 text-foreground">
        <div className="w-full flex flex-row justify-between items-center mb-6 ">
          <div className="flex flex-row gap-4 w-full md:w-1/2 items-center">
            <div className="w-[130px] h-[130px] flex items-center justify-center overflow-hidden rounded-full object-cover bg-white">
              {player?.photoUrl ? (
                <img
                  width={120}
                  height={120}
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
                <Button asChild variant="ghost">
                  <Link to={`/dashboard/players/${player.id}/edit`}>
                    <Edit2Icon />
                  </Link>
                </Button>
                <Form method="delete">
                  <input type="hidden" name="playerId" value={player.id} />
                  <Button variant="ghost">
                    <DeleteIcon />
                  </Button>
                </Form>
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
          <div>{/* <RadarAttributes /> */}</div>
        </div>
      </div>
      <div className="bg-card min-h-screen py-10">
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
