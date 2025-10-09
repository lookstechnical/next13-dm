import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { type MetaFunction } from "@remix-run/node";
import type { ShouldRevalidateFunctionArgs } from "@remix-run/react";
import { Link, Outlet, useLoaderData } from "@remix-run/react";
import { GroupCard } from "~/components/groups/group-card";
import { ListingHeader } from "~/components/layout/listing-header";
import { MoreActions } from "~/components/layout/more-actions";
import { AllowedRoles } from "~/components/route-protections";
import { Button } from "~/components/ui/button";
import { CardGrid } from "~/components/ui/card-grid";
import { GroupService } from "~/services/groupService";
import { PlayerGroup } from "~/types";
import { withAuth } from "~/utils/auth-helpers";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [{ title: "Groups" }, { name: "description", content: "Groups" }];
};

export const loader = withAuth(
  AllowedRoles.headOfDept,
  async ({ user, supabaseClient }) => {
    const groupService = new GroupService(supabaseClient);
    const groups = (await groupService.getGroupsByTeam(user.team.id)) || [];
    return { groups, user };
  }
);

// Prevent revalidation when navigating to child group routes
export function shouldRevalidate({ currentUrl, nextUrl, formAction }: ShouldRevalidateFunctionArgs) {
  // Always revalidate after form submissions
  if (formAction) return true;

  // If navigating to a group detail page, don't revalidate the list
  if (currentUrl.pathname === '/dashboard/groups' && nextUrl.pathname.startsWith('/dashboard/groups/')) {
    return false;
  }

  // If navigating back to the list from a child route, revalidate to get fresh data
  if (currentUrl.pathname.startsWith('/dashboard/groups/') && nextUrl.pathname === '/dashboard/groups') {
    return true;
  }

  return false;
}

export default function Groups() {
  const { groups, user } = useLoaderData<typeof loader>();
  return (
    <div className="flex flex-column space-y-10 container px-4 mx-auto py-10 text-foreground">
      <div className="w-full">
        <ListingHeader
          title="Player Groups"
          renderActions={() => {
            if (user.role === "ADMIN" || user.role === "HEAD_OF_DEPARTMENT") {
              return (
                <MoreActions>
                  <DropdownMenuItem asChild>
                    <Button asChild variant="outline" className="w-full">
                      <Link to={`/dashboard/groups/create`}>Add Group</Link>
                    </Button>
                  </DropdownMenuItem>
                </MoreActions>
              );
            }
            return null;
          }}
        />
        <CardGrid name={`${user.team.name} has 0 groups`} items={groups}>
          {groups?.map((group: PlayerGroup) => (
            <GroupCard group={group} to={(id) => `/dashboard/groups/${id}`} />
          ))}
        </CardGrid>
      </div>
      <Outlet />
    </div>
  );
}
