import type { ActionFunction, MetaFunction } from "@remix-run/node";
import { Form, Link, Outlet, useLoaderData } from "@remix-run/react";
import { UserMinus, UserPlus, Users2Icon } from "lucide-react";
import { ActionProtection } from "~/components/action-protection";
import { DeleteConfirm } from "~/components/forms/delete-confirm";
import { ListingHeader } from "~/components/layout/listing-header";
import { MoreActions } from "~/components/layout/more-actions";
import { AllowedRoles } from "~/components/route-protections";
import { DataTable } from "~/components/table/data-table";
import { Badge, BadgeProps } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { CardGrid } from "~/components/ui/card-grid";
import { DropdownMenuItem } from "~/components/ui/dropdown-menu";
import { ScoutService } from "~/services/scoutService";
import { TeamService } from "~/services/teamService";
import { Scout, Team, User } from "~/types";
import { invalidateUserAuth, withAuth, withAuthAction } from "~/utils/auth-helpers";
import { clearUserSession } from "~/utils/require-user";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [{ title: "Teams" }, { name: "description", content: "Teams" }];
};

export const loader = withAuth(async ({ user, supabaseClient }) => {
  const teamService = new TeamService(supabaseClient);
  const usersService = new ScoutService(supabaseClient);

  const teamsPromise = teamService.getAllTeams();
  const usersPromise = usersService.getAllScouts();

  const [teams, users] = await Promise.all([teamsPromise, usersPromise]);

  return { teams, users, user };
});

export const action: ActionFunction = withAuthAction(
  AllowedRoles.adminOnly,
  async ({ request, user, supabaseClient }) => {
    const formData = await request.formData();
    const targetId = formData.get("id") as string;

    if (!targetId) return { error: "No user selected." };

    // An admin deactivating themselves would be locked out by the very gate
    // this action arms, with no way back in from the UI.
    if (targetId === user.id) {
      return { error: "You cannot deactivate your own account." };
    }

    const usersService = new ScoutService(supabaseClient);
    const status = request.method === "DELETE" ? "inactive" : "active";

    await usersService.setUserStatus(targetId, status);

    // The auth layer caches users for 5 minutes, so without this a deactivated
    // user keeps working until their entry expires.
    invalidateUserAuth(targetId);
    clearUserSession();

    return { ok: true };
  }
);

const roleToVariant = (role: Scout["role"]): BadgeProps["variant"] => {
  switch (role) {
    case "ADMIN":
      return "default";
    case "COACH":
      return "secondary";
    case "HEAD_OF_DEPARTMENT":
      return "destructive";
    case "SCOUT":
      return "outline";
  }
};

const statusToVariant = (status: User["status"]): BadgeProps["variant"] => {
  switch (status) {
    case "active":
      return "default";
    case "pending":
      return "outline";
    case "inactive":
      return "destructive";
    default:
      return "outline";
  }
};

export default function Team() {
  const { users, teams, user } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-column space-y-10 container px-4 mx-auto py-10 text-foreground">
      <div className="w-full">
        <ListingHeader
          title={`Team`}
          renderActions={() => (
            <MoreActions>
              <DropdownMenuItem asChild>
                <Button asChild variant={"outline"}>
                  <Link to="/dashboard/team/create">
                    <Users2Icon />
                    Add Team
                  </Link>
                </Button>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Button asChild variant={"outline"}>
                  <Link to="/dashboard/team/invite">
                    <UserPlus />
                    Invite Member
                  </Link>
                </Button>
              </DropdownMenuItem>
            </MoreActions>
          )}
        />

        <CardGrid items={[{}]} name="You have 0 teams">
          {teams.map((team: Team) => (
            <Card className="rounded-lg shadow-sm border border-gray-100 p-4 text-foreground">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{team.name}</h3>
                <Badge
                  variant="secondary"
                  className="px-2 py-1 rounded-full text-xs font-medium uppercase"
                >
                  {team.type}
                </Badge>
              </div>
              <p className="text-sm mb-2 text-muted ">{team.description}</p>
            </Card>
          ))}
        </CardGrid>

        <h2 className="text-2xl mb-2 text-bold bold">Users</h2>
        <DataTable
          columns={[
            {
              key: "name",
              header: "Name",
              render: (val, row: User) => (
                <div>
                  <div></div>
                  <div>
                    <p className="text-bold bold">{row.name}</p>
                    <p className="text-muted">{row.email}</p>
                  </div>
                </div>
              ),
            },
            {
              key: "role",
              header: "Role",
              render: (val, row) => (
                <>
                  {row.teamMemberships?.map((member) => (
                    <div className="flex flex-row gap-2 mb-2">
                      <div>{member.teams.name}</div>
                      <div>
                        <Badge variant={roleToVariant(member.role)}>
                          {member.role.replaceAll("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {row.teamMemberships?.length === 0 && (
                    <Badge variant={roleToVariant(val)}>{val}</Badge>
                  )}
                </>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (val, row: User) => (
                <Badge variant={statusToVariant(row.status)}>
                  {row.status ?? "active"}
                </Badge>
              ),
            },
            {
              key: "id",
              header: "",
              className: "text-right",
              render: (val, row: User) => (
                <ActionProtection allowedRoles={AllowedRoles.adminOnly} user={user}>
                  {row.id === user.id ? null : row.status === "inactive" ? (
                    <Form method="post">
                      <input type="hidden" name="id" value={row.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Reactivate
                      </Button>
                    </Form>
                  ) : (
                    <DeleteConfirm
                      name={row.name}
                      id={row.id}
                      term="deactivate"
                    >
                      <Button variant="ghost" size="sm">
                        <UserMinus />
                        Deactivate
                      </Button>
                    </DeleteConfirm>
                  )}
                </ActionProtection>
              ),
            },
          ]}
          data={users}
        />
        <Outlet />
      </div>
    </div>
  );
}
