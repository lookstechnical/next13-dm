import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { Form, Link, redirect, useLoaderData } from "@remix-run/react";
import { Delete, Edit2 } from "lucide-react";
import { ActionProtection } from "~/components/action-protection";
import { AllowedRoles } from "~/components/route-protections";
import { ItemView } from "~/components/session/item-view";
import SheetPage from "~/components/sheet-page";
import { Button } from "~/components/ui/button";

import { getSupabaseServerClient } from "~/lib/supabase";
import { DrillsService } from "~/services/drillsService";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const { supabaseClient } = await getSupabaseServerClient(request);
  const { user: authUser } = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.id, supabaseClient);

  const drillService = new DrillsService(supabaseClient);
  const drill = params.id
    ? await drillService.getDrillById(params.id)
    : undefined;

  return { drill, user };
};

export const action: ActionFunction = async ({ request, params }) => {
  const { supabaseClient } = await getSupabaseServerClient(request);

  const drillService = new DrillsService(supabaseClient);
  await drillService.deleteDrill(params.id as string);

  return redirect("/dashboard/drills-library");
};

export default function PlayersCreate() {
  const { drill, user } = useLoaderData<typeof loader>();

  return (
    <SheetPage
      backLink="/dashboard/drills-library"
      title={drill.name}
      description=""
      renderFooterButtons={() => (
        <ActionProtection allowedRoles={AllowedRoles.adminOnly} user={user}>
          <div className="flex flex-row gap-2">
            <Form method="delete">
              <Button variant="destructive" className="text-foreground">
                Delete
              </Button>
            </Form>
            <Button
              type="button"
              asChild
              variant="outline"
              className="text-foreground"
            >
              <Link
                to={`/dashboard/drills-library/edit/${drill.id}`}
                className="flex flex-row gap2"
              >
                <Edit2 /> Edit
              </Link>
            </Button>
          </div>
        </ActionProtection>
      )}
    >
      <ItemView item={drill} />
    </SheetPage>
  );
}
