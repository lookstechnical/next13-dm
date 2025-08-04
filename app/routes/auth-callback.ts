import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { getSupabaseServerClient } from "~/lib/supabase";

export const loader = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const { supabaseClient, headers } = getSupabaseServerClient(request);
    const { error } = await supabaseClient.auth.exchangeCodeForSession(code);
    if (error) {
      return redirect("/");
    }
    return redirect("/dashboard", {
      headers,
    });
  }
  return new Response("Authentication failed. Please try again", {
    status: 400,
  });
};
