/**
 * Centralized server-side authentication utilities
 * Reduces redundant calls to client.auth.getUser() and provides caching
 */

import { redirect } from "@remix-run/node";
import { TeamService } from "~/services/teamService";
import { Team, User } from "~/types";

interface AuthCache {
  [key: string]: {
    user: User;
    timestamp: number;
    supabaseUser: any;
  };
}

// In-memory cache for user sessions (resets on server restart)
const authCache: AuthCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get authenticated user with caching to avoid repeated Supabase calls
 */
export async function getAuthenticatedUser(
  client: any,
  options: {
    redirectTo?: string;
    useCache?: boolean;
    required?: boolean;
  } = {}
): Promise<{ user: User; supabaseUser: any } | null> {
  const { redirectTo = "/", useCache = true, required = true } = options;

  try {
    // Get Supabase auth user
    const {
      data: { user: supabaseUser },
      error,
    } = await client.auth.getUser();

    if (error) {
      console.error("Auth error:", error);
      if (required) throw redirect(redirectTo);
      return null;
    }

    if (!supabaseUser) {
      if (required) throw redirect(redirectTo);
      return null;
    }

    // Check cache first
    const cacheKey = supabaseUser.id;
    if (useCache && authCache[cacheKey]) {
      const cached = authCache[cacheKey];
      const isExpired = Date.now() - cached.timestamp > CACHE_TTL;
      
      if (!isExpired) {
        return {
          user: cached.user,
          supabaseUser: cached.supabaseUser
        };
      } else {
        // Remove expired cache entry
        delete authCache[cacheKey];
      }
    }

    // Get full app user data
    const appUser = await getAppUser(supabaseUser.id, client);
    
    if (!appUser) {
      console.error("Failed to load app user data for:", supabaseUser.id);
      if (required) throw redirect(redirectTo);
      return null;
    }

    // Cache the result
    if (useCache) {
      authCache[cacheKey] = {
        user: appUser,
        supabaseUser,
        timestamp: Date.now()
      };
    }

    return { user: appUser, supabaseUser };
    
  } catch (error) {
    if (error instanceof Response) {
      throw error; // Re-throw redirect responses
    }
    console.error("Authentication error:", error);
    if (required) throw redirect(redirectTo);
    return null;
  }
}

/**
 * Get app user data from database (with minimal caching)
 */
async function getAppUser(userId: string, client: any): Promise<User | null> {
  const { data: userProfiles, error } = await client
    .from("users")
    .select(
      "id, name, email, role, avatar, status, invited_by, invited_at, created_at, updated_at, current_team"
    )
    .eq("id", userId)
    .limit(1);

  const userProfile =
    userProfiles && userProfiles.length > 0 ? userProfiles[0] : null;

  if (!userProfile) return null;

  // Load team memberships separately to avoid RLS recursion
  const { data: memberships, error: membershipsError } = await client
    .from("team_memberships")
    .select("team_id, role, joined_at")
    .eq("user_id", userId);

  if (membershipsError) {
    console.error("Error loading team memberships:", membershipsError);
  }

  let currentMembership = null;

  if (userProfile.current_team) {
    currentMembership = memberships?.find(
      (tm: any) => tm.team_id === userProfile.current_team
    );
  } else if (memberships && memberships.length > 0) {
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
  } else if (teams.length > 0) {
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
    teamMemberships: memberships?.map((m: any) => ({
      teamId: m.team_id,
      role: m.role,
      joinedAt: m.joined_at
    }))
  };

  return currentUser;
}

/**
 * Simplified requireUser function that uses caching
 */
export async function requireAuthenticatedUser(client: any) {
  return getAuthenticatedUser(client, { required: true });
}

/**
 * Check if user is logged in (for login/register routes)
 */
export async function checkIfLoggedIn(client: any, redirectTo = "/dashboard") {
  const result = await getAuthenticatedUser(client, { 
    required: false, 
    useCache: false // Don't cache for login checks
  });
  
  if (result?.user) {
    throw redirect(redirectTo);
  }

  return null;
}

/**
 * Clear authentication cache for a specific user
 */
export function clearAuthCache(userId?: string) {
  if (userId) {
    delete authCache[userId];
  } else {
    // Clear all cache
    Object.keys(authCache).forEach(key => delete authCache[key]);
  }
}

/**
 * Get cache statistics for monitoring
 */
export function getAuthCacheStats() {
  const entries = Object.keys(authCache);
  const now = Date.now();
  
  let activeEntries = 0;
  let expiredEntries = 0;
  
  entries.forEach(key => {
    const entry = authCache[key];
    if (now - entry.timestamp > CACHE_TTL) {
      expiredEntries++;
    } else {
      activeEntries++;
    }
  });

  return {
    totalEntries: entries.length,
    activeEntries,
    expiredEntries,
    cacheSize: entries.length,
    ttlMinutes: CACHE_TTL / (60 * 1000)
  };
}

/**
 * Cleanup expired cache entries
 */
export function cleanupAuthCache() {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  Object.entries(authCache).forEach(([key, entry]) => {
    if (now - entry.timestamp > CACHE_TTL) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => delete authCache[key]);
  
  return {
    deletedEntries: keysToDelete.length,
    remainingEntries: Object.keys(authCache).length
  };
}

// Auto-cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupAuthCache, 10 * 60 * 1000);
}