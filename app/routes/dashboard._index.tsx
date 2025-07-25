import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { CardGrid } from "~/components/ui/card-grid";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
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
            <div className="text-2xl font-bold"></div>
            {/* <p className="text-xs opacity-90">+20.1% from last month</p> */}
          </CardContent>
        </Card>
      </CardGrid>
    </div>
  );
}
