import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { CardGrid } from "~/components/ui/card-grid";
import { getSupabaseServerClient } from "~/lib/supabase";
import { DashboardService } from "~/services/dashboardService";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader: LoaderFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const dashService = new DashboardService(supabaseClient);

  const dashboard = await dashService.getDashboardStats();

  return { dashboard };
};

export default function Index() {
  const { dashboard } = useLoaderData<typeof loader>();
  return (
    <div className="container mx-auto">
      <CardGrid items={[{ test: "" }]} title="Dashboard">
        <Card className="card-gradient-green text-white border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Total Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.players}</div>
            {/* <p className="text-xs opacity-90">+20.1% from last month</p> */}
          </CardContent>
        </Card>

        <Card className="card-gradient-green text-white border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.events}</div>
            {/* <p className="text-xs opacity-90">+20.1% from last month</p> */}
          </CardContent>
        </Card>

        <Card className="card-gradient-green text-white border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Total Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.groups}</div>
            {/* <p className="text-xs opacity-90">+20.1% from last month</p> */}
          </CardContent>
        </Card>
      </CardGrid>
    </div>
  );
}
