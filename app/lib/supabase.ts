import { createClient } from "@supabase/supabase-js";
import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";

import { Database } from "./database.types";

// Validate environment variables
if (!import.meta.env.VITE_SUPABASE_URL) {
  throw new Error("Missing VITE_SUPABASE_URL environment variable");
}

if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_ANON_KEY environment variable");
}

// Validate URL format
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(`Invalid VITE_SUPABASE_URL format: ${supabaseUrl}`);
}

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Helper functions for common operations
export const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const signUp = async (
  email: string,
  password: string,
  userData: any
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData,
    },
  });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Team-related helpers
export const getUserTeams = async (userId: string) => {
  const { data, error } = await supabase
    .from("team_memberships")
    .select(
      `
      team_id,
      role,
      joined_at,
      teams (
        id,
        name,
        description,
        type
      )
    `
    )
    .eq("user_id", userId);

  if (error) throw error;
  return data;
};

// Player-related helpers
export const getPlayersInTeam = async (teamId: string) => {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", teamId)
    .order("name");

  if (error) throw error;
  return data;
};

// Match-related helpers
export const getMatchesInTeam = async (teamId: string) => {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("team_id", teamId)
    .order("date", { ascending: false });

  if (error) throw error;
  return data;
};

// Event-related helpers
export const getPublicEvents = async () => {
  const { data, error } = await supabase
    .from("events")
    .select(
      `
      *,
      event_registrations (
        id,
        player_id,
        status
      )
    `
    )
    .in("status", ["upcoming", "ongoing"])
    .order("date");

  if (error) throw error;
  return data;
};

// Report-related helpers
export const getPlayerReports = async (playerId: string) => {
  const { data, error } = await supabase
    .from("player_reports")
    .select(
      `
      *,
      matches (
        id,
        home_team,
        away_team,
        date,
        competition
      ),
      events (
        id,
        name,
        date,
        location
      ),
      users (
        id,
        name,
        avatar
      )
    `
    )
    .eq("player_id", playerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

export const getSupabaseServerClient = (request: Request) => {
  const headers = new Headers();
  const supabaseClient = createServerClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("Cookie") ?? "");
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            headers.append(
              "Set-Cookie",
              serializeCookieHeader(name, value, options)
            )
          );
        },
      },
    }
  );

  return { headers, supabaseClient };
};

export default supabase;
