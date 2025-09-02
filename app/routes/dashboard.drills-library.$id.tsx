import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { ItemView } from "~/components/session/item-view";
import SheetPage from "~/components/sheet-page";

import { getSupabaseServerClient } from "~/lib/supabase";
import { DrillsService } from "~/services/drillsService";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const { supabaseClient } = await getSupabaseServerClient(request);

  const drillService = new DrillsService(supabaseClient);
  const drill = params.id
    ? await drillService.getDrillById(params.id)
    : undefined;

  return { drill };
};

export default function PlayersCreate() {
  const { drill } = useLoaderData<typeof loader>();

  return (
    <SheetPage
      backLink="/dashboard/drills-library"
      title={drill.name}
      description=""
    >
      <ItemView item={drill} />
    </SheetPage>
  );
}
