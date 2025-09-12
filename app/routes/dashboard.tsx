import type { MetaFunction } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { Authenticated } from "~/components/layout/authenticated";
import { dashboardLayoutLoader } from "~/utils/auth-helpers";

export const meta: MetaFunction = () => {
  return [
    { title: "beCoachable" },
    { name: "description", content: "Welcome to beCoachable" },
  ];
};

export const loader = dashboardLayoutLoader;

export default function Layout() {
  const { user } = useLoaderData();

  return (
    <Authenticated user={user}>
      <Outlet />
    </Authenticated>
  );
}
