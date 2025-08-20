import { ActionFunction, json, redirect } from "@remix-run/node";
import { getSupabaseServerClient } from "~/lib/supabase";
import { ScoutService } from "~/services/scoutService";
import { clearUserSession, requireUser } from "~/utils/require-user";

export const loader = () => {
  return json({});
};

const allowedRedirects = [
  "/dashboard",
  "/dashboard/players",
  "/dashboard/events",
  "/dashboard/groups",
];

function getNearestRootUrl(path: string, allowed: string[]): string {
  // Ensure path starts with a slash and remove trailing slash
  const normalizedPath = path.replace(/\/+$/, "");

  // Find all allowed URLs that are a prefix of the given path
  const matches = allowed.filter(
    (url) => normalizedPath === url || normalizedPath.startsWith(url + "/")
  );

  // Return the longest match or null if none found
  return matches.length ? matches.sort((a, b) => b.length - a.length)[0] : "/";
}

export const action: ActionFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);

  clearUserSession();
  const user = await requireUser(supabaseClient);

  let formData = await request.formData();
  const teamId = formData.get("teamId") as string;
  const currentUrl = formData.get("currentUrl") as string;

  const scoutService = new ScoutService(supabaseClient);

  if (teamId) {
    await scoutService.updateTeamContext(user.user.id, teamId);
  }

  const redirectUrl = getNearestRootUrl(currentUrl, allowedRedirects);
  return redirect(redirectUrl);
};
