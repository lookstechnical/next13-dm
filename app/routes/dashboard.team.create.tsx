import type { ActionFunction, MetaFunction } from "@remix-run/node";
import { redirect } from "@remix-run/react";
import { TeamForm } from "~/components/forms/form/team";
import SheetPage from "~/components/sheet-page";
import { getSupabaseServerClient } from "~/lib/supabase";
import { TeamService } from "~/services/teamService";
import { Team } from "~/types";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [
    { title: "Add Event" },
    { name: "description", content: "Add Event" },
  ];
};

export const action: ActionFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const teamService = new TeamService(supabaseClient);

  const { user: authUser } = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.id, supabaseClient);

  if (!user) {
    return redirect("/");
  }

  let formData = await request.formData();
  const name = formData.get("name") as string;
  const type = formData.get("type") as Team["type"];
  const description = formData.get("description") as string;

  const data: Omit<Team, "id" | "createdAt"> = {
    name,
    type,
    description,
    createdBy: user.id,
  };

  await teamService.createTeam(data, user.id);

  return redirect("/dashboard/team");
};

export default function TeamCreate() {
  return (
    <SheetPage
      backLink="/dashboard/team"
      title="Add Team"
      description="Add Team"
      updateButton="Add Team"
      hasForm
    >
      <TeamForm />
    </SheetPage>
  );
}
