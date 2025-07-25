import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { Authenticated } from "~/components/layout/authenticated";
import { getSupabaseServerClient } from "~/lib/supabase";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader: LoaderFunction = async ({ request }) => {
  const response = new Response();
  const { supabaseClient } = getSupabaseServerClient(request);

  const authUser = await requireUser(supabaseClient);

  const user = await getAppUser(authUser.user.id, supabaseClient);

  return new Response(JSON.stringify({ user }), {
    headers: {
      ...response.headers,
      "Content-Type": "application/json",
    },
  });
};

export default function Layout() {
  const { user } = useLoaderData();

  return (
    <Authenticated user={user}>
      <Outlet />
    </Authenticated>
  );
}
