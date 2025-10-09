import type { MetaFunction } from "@remix-run/node";
import type { ShouldRevalidateFunctionArgs } from "@remix-run/react";
import { Outlet, useLoaderData } from "@remix-run/react";
import { Authenticated } from "~/components/layout/authenticated";
import { dashboardLayoutLoader } from "~/utils/auth-helpers";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [
    { title: "beCoachable" },
    { name: "description", content: "Welcome to beCoachable" },
  ];
};

export const loader = dashboardLayoutLoader;

// Prevent unnecessary revalidation when navigating between child routes
export function shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  // Only revalidate if we're navigating to/from the dashboard root
  // or if there's an action submission (form post, etc)
  if (currentUrl.pathname === nextUrl.pathname) {
    // Same route, use default behavior (revalidate on action)
    return defaultShouldRevalidate;
  }

  // Different routes within dashboard - don't revalidate parent
  // The user/auth data doesn't change between page navigations
  return false;
}

export default function Layout() {
  const { user } = useLoaderData<typeof dashboardLayoutLoader>();

  return (
    <Authenticated user={user}>
      <Outlet />
    </Authenticated>
  );
}
