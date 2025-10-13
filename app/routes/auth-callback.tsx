import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import { useEffect, useState } from "react";
import supabase from "~/lib/supabase";

/**
 * OAuth callback handler for Supabase magic links
 *
 * IMPORTANT: With PKCE flow (enabled by default for OTP), the auth code exchange
 * requires a code_verifier that's stored in the browser's localStorage.
 * Server-side exchange will ALWAYS fail with "code verifier should be non-empty" error.
 *
 * This component lets the client-side Supabase library (which has access to localStorage)
 * handle the session establishment using the PKCE verifier.
 */

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // If OAuth provider returned an error, redirect to login with error message
  if (error) {
    console.error("OAuth callback error:", {
      error,
      errorDescription,
      timestamp: new Date().toISOString(),
    });
    return redirect(`/?error=oauth&message=${encodeURIComponent(errorDescription || error)}`);
  }

  // Don't try to exchange code server-side - let the client component handle it
  // Server doesn't have access to the PKCE code_verifier in localStorage
  return null;
};

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("Auth callback: Starting - waiting for Supabase auto-detection");
        console.log("Auth callback: Full URL:", window.location.href);

        // Log localStorage state at start
        const allKeys = Object.keys(localStorage);
        const supabaseKeys = allKeys.filter(key =>
          key.startsWith('sb-') || key.includes('supabase')
        );
        console.log("Auth callback: Initial localStorage keys:", allKeys.length, "total,", supabaseKeys.length, "supabase-related");
        console.log("Auth callback: Supabase keys:", supabaseKeys);

        // Extract auth code from URL (check both query params and hash)
        const url = new URL(window.location.href);
        let code = url.searchParams.get('code');
        const error_param = url.searchParams.get('error');
        const error_description = url.searchParams.get('error_description');

        // Check hash fragment for code (some OAuth flows use this)
        const hash = window.location.hash;
        if (!code && hash) {
          const hashParams = new URLSearchParams(hash.substring(1));
          code = hashParams.get('code');
          console.log("Auth callback: Checking hash fragment for code:", {
            hash,
            codeFromHash: code ? code.substring(0, 10) + "..." : null
          });
        }

        // Also check for access_token directly in hash (implicit flow)
        const hashParams = new URLSearchParams(hash.substring(1));
        const access_token = hashParams.get('access_token');

        console.log("Auth callback: URL parameters:", {
          code: code ? code.substring(0, 10) + "..." : null,
          access_token: access_token ? access_token.substring(0, 10) + "..." : null,
          error: error_param,
          error_description,
          queryParams: Array.from(url.searchParams.entries()),
          hashParams: hash ? Array.from(hashParams.entries()) : [],
          pathname: url.pathname,
          search: url.search,
          hash: url.hash
        });

        // Handle access_token in hash (implicit/legacy flow)
        if (access_token && !code) {
          console.log("Auth callback: Found access_token in hash, not code. This is implicit flow, not PKCE.");

          // For implicit flow, manually set the session using the tokens from hash
          const refresh_token = hashParams.get('refresh_token');
          console.log("Auth callback: Setting session from hash tokens");

          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token || '',
          });

          if (sessionError) {
            console.error("Auth callback: Error setting session:", sessionError);
            navigate(`/?error=session&message=${encodeURIComponent("Failed to establish session")}&debug=${encodeURIComponent(sessionError.message)}`);
            return;
          }

          if (data.session) {
            console.log("Auth callback: Session established successfully for user:", data.session.user.id);
            console.log("Auth callback: Waiting for cookies to be set, then redirecting with full page load");

            // Wait a moment for cookies to be set
            await new Promise(resolve => setTimeout(resolve, 500));

            // Use window.location instead of navigate() to do a full page load
            // This ensures the server gets the session cookies
            window.location.href = "/dashboard";
            return;
          } else {
            console.error("Auth callback: setSession succeeded but no session returned");
            navigate("/?error=no_session&message=Failed+to+create+session");
            return;
          }
        }

        // If no code and no access_token, check if session exists anyway
        // (Supabase might have set cookies directly)
        if (!code && !access_token) {
          console.log("Auth callback: No code or access_token, but checking if session exists from cookies...");

          // Wait a moment for any async auth processing
          await new Promise(resolve => setTimeout(resolve, 1000));

          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (session) {
            console.log("Auth callback: Session exists from cookies! User:", session.user.id);
            navigate("/dashboard");
            return;
          }

          console.error("Auth callback error: No code, no access_token, and no session. Full URL:", url.toString());
          console.error("Session error:", sessionError);
          console.error("This suggests the magic link verification failed or PKCE is misconfigured.");
          console.error("Check Supabase Dashboard → Authentication → Settings → PKCE Verification");
          navigate("/?error=missing_code&message=Authentication+failed.+No+credentials+received+from+login+link.");
          return;
        }

        console.log("Auth callback: Code found, waiting for automatic session exchange");

        // The Supabase client has detectSessionInUrl: true, so it will automatically
        // detect the auth code and exchange it for a session using PKCE.
        // We just need to wait for it to complete and check the session.

        // Wait a bit for the auto-detection to kick in
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if session was established
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Auth callback session error:", sessionError);

          let message = "Authentication failed. Please try again.";

          if (sessionError.message.includes("verifier") || sessionError.message.includes("pkce")) {
            message = "Session verification failed. Please click the login link on the same device and browser where you requested it.";
          } else if (sessionError.message.includes("expired")) {
            message = "This login link has expired. Please request a new one.";
          } else if (sessionError.message.includes("already") || sessionError.message.includes("used")) {
            message = "This login link has already been used. Please request a new one.";
          } else if (sessionError.message.includes("invalid")) {
            message = "Invalid login link. Please request a new one.";
          }

          navigate(`/?error=session&message=${encodeURIComponent(message)}&debug=${encodeURIComponent(sessionError.message)}`);
          return;
        }

        if (session) {
          console.log("Auth callback: Session established successfully for user:", session.user.id);
          navigate("/dashboard");
        } else {
          // No session yet - wait longer and try once more
          console.log("Auth callback: No session yet, waiting longer...");
          await new Promise(resolve => setTimeout(resolve, 1500));

          const { data: { session: retrySession } } = await supabase.auth.getSession();

          if (retrySession) {
            console.log("Auth callback: Session established on retry");
            navigate("/dashboard");
          } else {
            console.error("Auth callback: No session after retry");

            // Log all localStorage keys for debugging
            const allKeys = Object.keys(localStorage);
            console.log("Auth callback: localStorage keys:", allKeys);

            // Check if PKCE verifier exists (try multiple patterns)
            const supabaseKeys = allKeys.filter(key =>
              key.startsWith('sb-') || key.includes('supabase')
            );
            console.log("Auth callback: Supabase-related keys:", supabaseKeys);

            if (supabaseKeys.length === 0) {
              const message = "Please click the login link on the same device and browser where you requested it.";
              navigate(`/?error=verifier_missing&message=${encodeURIComponent(message)}`);
            } else {
              // We have supabase keys but no session - this is unexpected
              console.error("Auth callback: Have Supabase keys but no session. Keys:", supabaseKeys);
              navigate("/?error=no_session&message=Could+not+establish+session.+Please+try+again.");
            }
          }
        }
      } catch (err) {
        console.error("Unexpected auth callback error:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError("An unexpected error occurred. Please try again.");
        setTimeout(() => {
          navigate(`/?error=unexpected&message=${encodeURIComponent(errorMessage)}`);
        }, 2000);
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-lg mb-2">Completing authentication...</p>
        <p className="text-sm text-muted-foreground">Please wait while we log you in</p>
      </div>
    </div>
  );
}
