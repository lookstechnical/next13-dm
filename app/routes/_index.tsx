import type { LoaderFunction, MetaFunction } from "@remix-run/node";
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
  const instructions = url.searchParams.get("instructions");

  await isLoggedIn(supabaseClient);

  return { error, message, debug, instructions };
};

// No server action needed - handled client-side with implicit flow

export default function Index() {
  const loaderData = useLoaderData<{
    error?: string;
    message?: string;
    debug?: string;
    instructions?: string;
  }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        // session is active
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const emailValue = formData.get("email") as string;
    setEmail(emailValue);

    try {
      console.log("Requesting OTP code for email:", emailValue);

      // Send OTP without redirect - user will enter code on same page
      const { error, data } = await supabase.auth.signInWithOtp({
        email: emailValue,
        options: {
          shouldCreateUser: true,
        },
      });

      console.log("signInWithOtp response:", { error, data });

      if (error) {
        console.error("Sign in error:", error);
        setError(
          error.message || "Failed to send verification code. Please try again."
        );
      } else {
        console.log("Verification code sent successfully");
        setEmailSent(true);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log("Verifying OTP code for email:", email);

      const { error, data } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: "email",
      });

      console.log("verifyOtp response:", { error, data });

      if (error) {
        console.error("Verification error:", error);
        setError(
          error.message || "Invalid verification code. Please try again."
        );
      } else if (data.session) {
        console.log("Verification successful, session established");
        // Wait a moment for cookies to be set
        await new Promise((resolve) => setTimeout(resolve, 500));
        // Navigate to dashboard
        navigate("/dashboard");
      } else {
        console.error("Verification succeeded but no session returned");
        setError("Authentication failed. Please try again.");
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
            <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded text-red-300 text-sm">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <p className="font-medium mb-1">{loaderData.message}</p>

                  {loaderData.instructions && (
                    <div className="mt-3 p-3 bg-black/20 rounded border border-red-800">
                      <p className="font-medium mb-1 text-red-200">
                        How to fix:
                      </p>
                      <p className="text-xs">{loaderData.instructions}</p>
                    </div>
                  )}

                  {loaderData.error === "storage_blocked" && (
                    <div className="mt-3 text-xs space-y-1 text-red-200">
                      <p className="font-medium">Common causes:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Private/Incognito browsing mode</li>
                        <li>Browser privacy settings blocking cookies</li>
                        <li>Browser extensions (ad blockers, privacy tools)</li>
                      </ul>
                    </div>
                  )}

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
              </div>
            </div>
          )}

          {/* Display client-side errors */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          {emailSent ? (
            <form onSubmit={handleVerifyCode}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-green-400 mb-2">
                    Verification code sent to {email}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Please enter the 6-digit code from your email.
                  </p>
                  <label className="text-sm font-medium text-gray-300">
                    Verification Code
                  </label>
                  <Input
                    name="code"
                    type="text"
                    required
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="bg-dashboard-card border-gray-600 placeholder:text-gray-400"
                    disabled={isLoading}
                    autoComplete="one-time-code"
                  />
                </div>
                <div className="flex justify-between items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailSent(false);
                      setVerificationCode("");
                      setError(null);
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Change email
                  </button>
                  <ActionButton
                    title={isLoading ? "Verifying..." : "Verify"}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleEmailSubmit}>
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
                    className="bg-dashboard-card border-gray-600  placeholder:text-gray-400"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex justify-end flex-row w-full">
                  <ActionButton
                    title={isLoading ? "Sending..." : "Send Code"}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
