import type { MetaFunction } from "@remix-run/node";
import { Link, Outlet, useLoaderData } from "@remix-run/react";
import { UserPlus, Users2Icon } from "lucide-react";
import { ListingHeader } from "~/components/layout/listing-header";
import { MoreActions } from "~/components/layout/more-actions";
import { DataTable } from "~/components/table/data-table";
import { Badge, BadgeProps } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { CardGrid } from "~/components/ui/card-grid";
import { DropdownMenuItem } from "~/components/ui/dropdown-menu";
import { ScoutService } from "~/services/scoutService";
import { TeamService } from "~/services/teamService";
import { Scout, Team, User } from "~/types";
import { withAuth } from "~/utils/auth-helpers";

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
          ]}
          data={users}
        />
        <Outlet />
      </div>
    </div>
  );
}
