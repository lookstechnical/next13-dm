import supabase from "../lib/supabase";
import { teamService } from "../services/teamService";
import { Team, User } from "../types";

type CachedUser = {
  currentUser: User;
  currentTeam?: Team | null;
};

let cachedUser: CachedUser | undefined = undefined;

export const getUser = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return { currentUser: undefined };

  const { data: userProfiles, error } = await supabase
    .from("users")
    .select(
      "id, name, email, role, avatar, status, invited_by, invited_at, created_at, updated_at, current_team"
    )
    .eq("id", session.user.id)
    .limit(1);

  if (error) {
    console.log("user does not exist");
    throw error;
  }

  const userProfile =
    userProfiles && userProfiles.length > 0 ? userProfiles[0] : null;

  if (userProfile) {
    // Load team memberships separately to avoid RLS recursion
    const { data: memberships, error: membershipsError } = await supabase
      .from("team_memberships")
      .select("team_id, role, joined_at")
      .eq("user_id", session.user.id);

    if (membershipsError) {
      console.error("Error loading team memberships:", membershipsError);
    }

    const currentMembership = memberships?.find(
      (tm: any) => tm.team_id === userProfiles[0].current_team
    );

    const currentUser: User = {
      ...userProfile,
      role:
        (currentMembership?.role as
          | "ADMIN"
          | "HEAD_OF_DEPARTMENT"
          | "SCOUT"
          | "COACH") || "ADMIN",
      // teamMemberships:
      //   memberships?.map((tm: any) => ({
      //     teamId: tm.team_id,
      //     role: tm.role,
      //     joinedAt: tm.joined_at,
      //   })) || [],
    };

    let currentTeam = undefined;
    // Auto-select first team if available and user is not admin
    if (currentUser.current_team) {
      currentTeam = await teamService.getTeamById(currentUser.current_team);
    } else {
      if (currentUser.role === "ADMIN") {
        const teams = await teamService.getAllTeams();
        currentTeam = teams[0];
      }
    }

    return { currentUser, currentTeam };
  }
};
