import { ActionFunction, json, redirect } from "@remix-run/node";
import { getSupabaseServerClient } from "~/lib/supabase";
import { ScoutService } from "~/services/scoutService";
import { requireUser } from "~/utils/require-user";

export const loader = () => {
  return json({});
};

export const action: ActionFunction = async ({ request }) => {
  console.log("switch teams acction called");
  const { supabaseClient } = getSupabaseServerClient(request);

  const user = await requireUser(supabaseClient);

  let formData = await request.formData();
  const teamId = formData.get("teamId") as string;
  const currentUrl = formData.get("currentUrl") as string;

  const scoutService = new ScoutService(supabaseClient);

  if (teamId) {
    await scoutService.updateTeamContext(user.user.id, teamId);
  }

  return redirect(currentUrl);
};
