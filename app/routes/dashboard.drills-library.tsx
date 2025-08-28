import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import {
  Link,
  Outlet,
  redirect,
  useLoaderData,
  useSubmit,
} from "@remix-run/react";
import { UserPlus } from "lucide-react";
import { DrillCard } from "~/components/drill/drill-card";
import { DrillFilters } from "~/components/drill/filters";
import { ListingHeader } from "~/components/layout/listing-header";
import { MoreActions } from "~/components/layout/more-actions";
import { Button } from "~/components/ui/button";
import { CardGrid } from "~/components/ui/card-grid";
import { DropdownMenuItem } from "~/components/ui/dropdown-menu";
import { getSupabaseServerClient } from "~/lib/supabase";
import { DrillsService } from "~/services/drillsService";
import { Drill } from "~/types";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = async ({ request }) => {
  // const;
  const { supabaseClient } = getSupabaseServerClient(request);
  const authUser = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.user.id, supabaseClient);
  if (!user) {
    return redirect("/");
  }
  const drillsService = new DrillsService(supabaseClient);

  const url = new URL(request.url);
  const name = url.searchParams.get("name");
  const categoryFilter = url.searchParams.get("categories");

  const drills = await drillsService.getAllDrills(
    name as string,
    categoryFilter !== "" ? (categoryFilter?.split(",") as string[]) : []
  );
  const categories = await drillsService.getAllDrillCategories();

  return { drills, categories, appliedFilters: { name, categoryFilter } };
};

export default function DrillsLibrary() {
  const { drills, categories, appliedFilters, groups } =
    useLoaderData<typeof loader>();

  const cardUrl = (id: string) => {
    return `/dashboard/drills-library/${id}`;
  };

  return (
    <div className="flex flex-column space-y-10 container px-4 mx-auto py-10 text-foreground">
      <div className="w-full">
        <ListingHeader
          title={`Drills and Games`}
          renderActions={() => (
            <div className="flex flex-row items-end justify-center gap-4 p-0 m-0">
              <DrillFilters
                appliedFilters={appliedFilters}
                groups={groups}
                categories={categories}
              />

              <MoreActions>
                {/* <DropdownMenuItem asChild>
                  <Button asChild variant={"outline"}>
                    <Link to="/dashboard/players/csv-import">
                      <DownloadIcon />
                      Import CSV
                    </Link>
                  </Button>
                </DropdownMenuItem> */}
                <DropdownMenuItem asChild>
                  <Button asChild variant={"outline"}>
                    <Link to="/dashboard/drills-library/create">
                      <UserPlus />
                      Add Drill/Skill
                    </Link>
                  </Button>
                </DropdownMenuItem>
              </MoreActions>
            </div>
          )}
        />

        <CardGrid
          name={`Currently there are 0 drill`}
          items={drills || []}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          {drills?.map((drill: Drill) => (
            <DrillCard
              key={`drills-card-${drill.id}`}
              drill={drill}
              to={cardUrl}
            />
          ))}
        </CardGrid>

        <Outlet />
      </div>
    </div>
  );
}
