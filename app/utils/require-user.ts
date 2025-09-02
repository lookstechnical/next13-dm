import { redirect } from "@remix-run/node";
import { TeamService } from "~/services/teamService";
import { Team, User } from "~/types";
import { AuthRateLimiter } from "./auth-rate-limiter";

let sessionUser: User | undefined = undefined;
let sessionUserExpiry: number = 0;
const USER_CACHE_TTL = 60 * 1000; // 1 minute cache for user profile

export async function getAppUser(userId: string, client: any) {
  const now = Date.now();
  
  // Check if we have valid cached user data
  if (sessionUser && sessionUser.id === userId && now < sessionUserExpiry) {
    return sessionUser;
  }

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

    let currentMembership = null;

    if (userProfiles[0].current_team) {
      currentMembership = memberships?.find(
        (tm: any) => tm.team_id === userProfiles[0].current_team
      );
    } else {
      currentMembership = memberships[0];
    }

    const teamService = new TeamService(client);

    let teams: Team[] = [];
    if (userProfile.role === "ADMIN") {
      teams = await teamService.getAllTeams();
    } else {
      teams = await teamService.getUserTeams(userProfile);
    }

    let team = null;
    if (userProfile.current_team) {
      team = teams.find((team) => team.id === userProfile.current_team);
    } else {
      team = teams[0];
    }

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

    sessionUser = currentUser;
    sessionUserExpiry = now + USER_CACHE_TTL; // Cache for 1 minute

    return sessionUser;
  }
}

export const clearUserSession = () => {
  sessionUser = undefined;
  sessionUserExpiry = 0;
};

export async function requireUser(client: any) {
  try {
    const { user, error } = await AuthRateLimiter.getUser(client);

    if (error && !user) {
      console.error("[requireUser] Auth error:", error);
      throw redirect("/");
    }
    
    if (!user) {
      throw redirect("/");
    }
    
    return { user };
  } catch (error: any) {
    console.error("[requireUser] Rate limiter error:", error.message);
    
    // If it's a rate limit error, try to redirect gracefully
    if (error.message?.includes('rate limit exceeded')) {
      // You might want to redirect to a "please wait" page instead
      throw redirect("/?error=rate_limit");
    }
    
    throw redirect("/");
  }
}

export async function isLoggedIn(client: any) {
  try {
    const { user, error } = await AuthRateLimiter.getUser(client);

    if (user) {
      throw redirect("/dashboard");
    }

    return {};
  } catch (error: any) {
    console.error("[isLoggedIn] Rate limiter error:", error.message);
    
    // If rate limited, assume not logged in for safety
    if (error.message?.includes('rate limit exceeded')) {
      return {};
    }
    
    // For other errors, also assume not logged in
    return {};
  }
}
