import type {
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useEffect, useState } from "react";
import ActionButton from "~/components/ui/action-button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import supabase, { getSupabaseServerClient } from "~/lib/supabase";
import { isLoggedIn } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [
    { title: "beCoachable" },
    { name: "description", content: "Welcome to beCoachable!" },
  ];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const message = url.searchParams.get("message");
  const debug = url.searchParams.get("debug");

  await isLoggedIn(supabaseClient);

  return { error, message, debug };
};

// No server action needed - handled client-side for PKCE

export default function Index() {
  const loaderData = useLoaderData<{ error?: string; message?: string; debug?: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        // session is active
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    try {
      const redirectUrl = `${window.location.origin}/auth-callback`;
      console.log("Requesting magic link with redirect URL:", redirectUrl);

      // Call signInWithOtp client-side so PKCE verifier is stored in localStorage
      const { error, data } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      console.log("signInWithOtp response:", { error, data });

      if (error) {
        console.error("Sign in error:", error);
        setError(error.message || "Failed to send email. Please try again.");
      } else {
        console.log("Magic link sent successfully. Check localStorage for PKCE verifier:");
        const storageKeys = Object.keys(localStorage).filter(k =>
          k.startsWith('sb-') || k.includes('supabase')
        );
        console.log("Supabase keys in localStorage:", storageKeys);
        setEmailSent(true);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      <Card className="w-3/4 md:w-1/4">
        <CardContent className="p-10 ">
          <h1 className="text-2xl uppercase my-2">Login</h1>

          {/* Display auth callback errors */}
          {loaderData?.error && loaderData?.message && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded text-red-300 text-sm">
              <p>{loaderData.message}</p>
              {loaderData.debug && (
                <details className="mt-2 text-xs opacity-75">
                  <summary className="cursor-pointer hover:opacity-100">
                    Technical details
                  </summary>
                  <pre className="mt-2 p-2 bg-black/30 rounded overflow-x-auto">
                    {loaderData.debug}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Display client-side errors */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          {emailSent ? (
            <div className="space-y-2">
              <p className="text-green-400">An email with a link has been sent to login</p>
              <p className="text-sm text-muted-foreground">
                Please check your email and click the link to sign in.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Email
                  </label>
                  <Input
                    name="email"
                    type="email"
                    required
                    placeholder="Enter your email"
                    className="bg-dashboard-card border-gray-600 text-black placeholder:text-gray-400"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex justify-end flex-row w-full">
                  <ActionButton title={isLoading ? "Sending..." : "Login"} disabled={isLoading} />
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
