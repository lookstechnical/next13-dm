import type { MetaFunction } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import { useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import supabase from "~/lib/supabase";

export const meta: MetaFunction = () => {
  return [
    { title: "Account deactivated" },
    { name: "description", content: "Account deactivated" },
  ];
};

// Deliberately no loader auth: a deactivated user is still holding a valid
// Supabase session, and every guarded route bounces them here. Clearing the
// session client-side is what stops "/" from sending them back to /dashboard.
export default function Deactivated() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.signOut().catch(() => {
      // Nothing useful to do if sign-out fails; the server gate still holds.
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center text-foreground px-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 space-y-4">
          <h1 className="text-xl font-semibold">Account deactivated</h1>
          <p className="text-muted">
            Your account has been deactivated and you no longer have access.
            Please contact your administrator if you think this is a mistake.
          </p>
          <Button onClick={() => navigate("/")}>Back to sign in</Button>
        </CardContent>
      </Card>
    </div>
  );
}
