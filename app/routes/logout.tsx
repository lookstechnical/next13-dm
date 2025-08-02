import { ActionFunction, redirect } from "@remix-run/node";
import { getSupabaseServerClient } from "~/lib/supabase";

export const action: ActionFunction = ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);

  supabaseClient.auth.signOut();

  return redirect("/");
};
