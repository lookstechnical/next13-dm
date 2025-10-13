import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { getSupabaseServerClient } from "~/lib/supabase";

export const loader = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Check if OAuth provider returned an error
  if (error) {
    console.error("OAuth error:", {
      error,
      errorDescription,
      url: url.toString(),
      timestamp: new Date().toISOString(),
    });
    return redirect(`/?error=oauth&message=${encodeURIComponent(errorDescription || error)}`);
  }

  if (code) {
    const { supabaseClient, headers } = getSupabaseServerClient(request);
    const { error } = await supabaseClient.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Failed to exchange code for session:", {
        error: error.message,
        code: error.code,
        url: url.toString(),
        timestamp: new Date().toISOString(),
      });

      // Provide user-friendly error messages
      const message = error.message.includes("expired") || error.message.includes("invalid")
        ? "This login link has expired or been used already. Please request a new one."
        : "Authentication failed. Please try again.";

      return redirect(`/?error=session&message=${encodeURIComponent(message)}`);
    }
    return redirect("/dashboard", {
      headers,
    });
  }

  // No code and no error - likely user clicked callback directly or link was modified
  console.error("No code or error in callback URL:", {
    url: url.toString(),
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get("user-agent"),
  });

  return redirect("/?error=missing_code&message=Invalid+login+link.+Please+request+a+new+one.");
};
