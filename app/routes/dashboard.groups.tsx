import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { type MetaFunction } from "@remix-run/node";
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
