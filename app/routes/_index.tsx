import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { Form, redirect, useActionData, useNavigate } from "@remix-run/react";
import { useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import supabase, { getSupabaseServerClient } from "~/lib/supabase";
import { isLoggedIn } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  return isLoggedIn(supabaseClient);
};

export const action: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  const email = formData.get("email") as string;
  const { supabaseClient, headers } = getSupabaseServerClient(request);
  headers.set("Content-Type", "application/json");

  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${import.meta.env.VITE_URL}/auth-callback`,
    },
  });

  if (!error) {
    return new Response(
      JSON.stringify({ status: 200, message: "Email sent" }),
      {
        headers,
      }
    );
  }

  return new Response(
    JSON.stringify({ status: 500, message: "Email not sent" }),
    {
      headers,
    }
  );
};

export default function Index() {
  const action = useActionData<{ status: number; message: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        // session is active
        navigate("/dashboard");
      }
    });
  }, []);

  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      <Card className="w-3/4 md:w-1/4">
        <CardContent className="p-10 ">
          <h1 className="text-2xl uppercase my-2">Login</h1>
          {action?.status === 200 ? (
            <p>An email with a link has been sent to login</p>
          ) : (
            <Form action="" method="post">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Email
                  </label>
                  <Input
                    name="email"
                    placeholder="Enter your email"
                    className="bg-dashboard-card border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="flex justify-end flex-row w-full">
                  <Button>Login</Button>
                </div>
              </div>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
