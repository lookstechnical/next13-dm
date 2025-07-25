import { redirect } from "@remix-run/node";
import { TeamService } from "~/services/teamService";
import { Team, User } from "~/types";

export async function getAppUser(userId: string, client: any) {
  const { data: userProfiles, error } = await client
    .from("users")
    .select(
      "id, name, email, role, avatar, status, invited_by, invited_at, created_at, updated_at, current_team"
    )
    .eq("id", userId)
    .limit(1);

  const userProfile =
    userProfiles && userProfiles.length > 0 ? userProfiles[0] : null;

  if (userProfile) {
    // Load team memberships separately to avoid RLS recursion
    const { data: memberships, error: membershipsError } = await client
      .from("team_memberships")
      .select("team_id, role, joined_at")
      .eq("user_id", userId);

    if (membershipsError) {
      console.error("Error loading team memberships:", membershipsError);
    }

    const currentMembership = memberships?.find(
      (tm: any) => tm.team_id === userProfiles[0].current_team
    );

    const teamService = new TeamService(client);

    let teams: Team[] = [];
    if (userProfile.role === "ADMIN") {
      teams = await teamService.getAllTeams();
    } else {
      teams = await teamService.getUserTeams(userProfile);
    }
    const team = teams.find((team) => team.id === userProfile.current_team);

    const currentUser: User = {
      ...userProfile,
      team: team,
      teams: teams.map(({ id, name }) => ({ id, name })),
      role:
        (currentMembership?.role as
          | "ADMIN"
          | "HEAD_OF_DEPARTMENT"
          | "SCOUT"
          | "COACH") || "ADMIN",
    };

    return currentUser;
  }
}

export async function requireUser(client: any) {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (!user) throw redirect("/");
  return { user };
}

export async function isLoggedIn(client: any) {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (user) throw redirect("/dashboard");

  return {};
}
