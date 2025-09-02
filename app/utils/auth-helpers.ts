import { json, redirect } from "@remix-run/node";
import { getSupabaseServerClient } from "~/lib/supabase";
import { requireUser, getAppUser } from "./require-user";
import { AuthRateLimiter } from "./auth-rate-limiter";

export interface AuthContext {
  user: any;
  appUser: any;
  supabaseClient: any;
}

/**
 * High-level auth helpers that combine multiple auth operations
 * with optimized patterns to reduce auth API calls
 */
export class AuthHelpers {
  /**
   * Complete authentication flow for protected routes
   * Returns user, appUser, and client in one call
   */
  static async getAuthContext(request: Request): Promise<AuthContext> {
    const { supabaseClient } = getSupabaseServerClient(request);
    
    try {
      const { user } = await requireUser(supabaseClient);
      const appUser = await getAppUser(user.id, supabaseClient);
      
      return {
        user,
        appUser,
        supabaseClient
      };
    } catch (error) {
      // If it's a redirect, let it propagate
      if (error instanceof Response) {
        throw error;
      }
      
      console.error("[AuthHelpers] Auth context error:", error);
      throw redirect("/");
    }
  }

  /**
   * Check authentication without throwing redirects
   * Useful for optional auth or API routes
   */
  static async checkAuth(request: Request): Promise<AuthContext | null> {
    const { supabaseClient } = getSupabaseServerClient(request);
    
    try {
      const { user } = await AuthRateLimiter.getUser(supabaseClient);
      
      if (!user) {
        return null;
      }
      
      const appUser = await getAppUser(user.id, supabaseClient);
      
      return {
        user,
        appUser,
        supabaseClient
      };
    } catch (error) {
      console.error("[AuthHelpers] Optional auth check error:", error);
      return null;
    }
  }

  /**
   * Require specific role with single auth check
   */
  static async requireRole(
    request: Request, 
    allowedRoles: Array<"ADMIN" | "HEAD_OF_DEPARTMENT" | "SCOUT" | "COACH">
  ): Promise<AuthContext> {
    const authContext = await this.getAuthContext(request);
    
    if (!allowedRoles.includes(authContext.appUser.role)) {
      throw json(
        { error: "Insufficient permissions" }, 
        { status: 403 }
      );
    }
    
    return authContext;
  }

  /**
   * Require team membership with single auth check
   */
  static async requireTeamMember(request: Request, teamId?: string): Promise<AuthContext> {
    const authContext = await this.getAuthContext(request);
    
    if (teamId && authContext.appUser.team?.id !== teamId) {
      // Check if user has access to this team
      const hasAccess = authContext.appUser.teams?.some((team: any) => team.id === teamId);
      
      if (!hasAccess) {
        throw json(
          { error: "Access denied to this team" }, 
          { status: 403 }
        );
      }
    }
    
    return authContext;
  }

  /**
   * Admin-only route helper
   */
  static async requireAdmin(request: Request): Promise<AuthContext> {
    return this.requireRole(request, ["ADMIN"]);
  }

  /**
   * Coach or higher role helper
   */
  static async requireCoach(request: Request): Promise<AuthContext> {
    return this.requireRole(request, ["ADMIN", "HEAD_OF_DEPARTMENT", "COACH"]);
  }

  /**
   * Any authenticated user helper
   */
  static async requireAnyUser(request: Request): Promise<AuthContext> {
    return this.getAuthContext(request);
  }

  /**
   * Logout helper that clears all caches
   */
  static async logout(request: Request): Promise<Response> {
    const { supabaseClient } = getSupabaseServerClient(request);
    
    try {
      // Clear auth cache
      AuthRateLimiter.clearCache(supabaseClient);
      
      // Sign out from Supabase
      await supabaseClient.auth.signOut();
      
      return redirect("/");
    } catch (error) {
      console.error("[AuthHelpers] Logout error:", error);
      // Even if logout fails, redirect to home
      return redirect("/");
    }
  }

  /**
   * Get auth status for client-side hydration
   */
  static async getAuthStatus(request: Request): Promise<{
    isAuthenticated: boolean;
    user?: any;
    role?: string;
    teamId?: string;
  }> {
    const authContext = await this.checkAuth(request);
    
    if (!authContext) {
      return { isAuthenticated: false };
    }
    
    return {
      isAuthenticated: true,
      user: {
        id: authContext.user.id,
        email: authContext.user.email,
        name: authContext.appUser.name
      },
      role: authContext.appUser.role,
      teamId: authContext.appUser.team?.id
    };
  }
}

/**
 * Decorator-style auth helpers for route handlers
 */
export function withAuth<T extends any[]>(
  handler: (authContext: AuthContext, ...args: T) => any
) {
  return async (request: Request, ...args: T) => {
    const authContext = await AuthHelpers.getAuthContext(request);
    return handler(authContext, ...args);
  };
}

export function withOptionalAuth<T extends any[]>(
  handler: (authContext: AuthContext | null, ...args: T) => any
) {
  return async (request: Request, ...args: T) => {
    const authContext = await AuthHelpers.checkAuth(request);
    return handler(authContext, ...args);
  };
}

export function withRole<T extends any[]>(
  allowedRoles: Array<"ADMIN" | "HEAD_OF_DEPARTMENT" | "SCOUT" | "COACH">,
  handler: (authContext: AuthContext, ...args: T) => any
) {
  return async (request: Request, ...args: T) => {
    const authContext = await AuthHelpers.requireRole(request, allowedRoles);
    return handler(authContext, ...args);
  };
}