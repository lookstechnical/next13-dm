/**
 * Authentication helper functions for routes
 * Drop-in replacements that reduce Supabase calls
 */

import { LoaderFunction, ActionFunction } from "@remix-run/node";
import { getSupabaseServerClient } from "~/lib/supabase";
import {
  requireAuthenticatedUser,
  checkIfLoggedIn,
  clearAuthCache,
} from "./auth.server";

/**
 * Higher-order function to wrap loaders with authentication
 * Automatically handles auth and provides user data
 * @param loaderOrRoles - Either the loader function or allowed roles array
 * @param loader - The loader function (if roles provided as first param)
 */
export function withAuth<T = any>(
  loaderOrRoles:
    | ((args: {
        request: Request;
        params: any;
        context?: any;
        user: any;
        supabaseUser: any;
        supabaseClient: any;
      }) => Promise<T>)
    | string[],
  loader?: (args: {
    request: Request;
    params: any;
    context?: any;
    user: any;
    supabaseUser: any;
    supabaseClient: any;
  }) => Promise<T>
): LoaderFunction {
  // Handle overloaded function signature
  if (Array.isArray(loaderOrRoles)) {
    // withAuth(allowedRoles, loader)
    if (!loader) {
      throw new Error(
        "Loader function is required when providing allowed roles"
      );
    }
    return withAuthAndRole(loaderOrRoles, loader);
  }

  // Handle single parameter: withAuth(loader)
  const actualLoader = loaderOrRoles;
  return async ({ request, params, context }) => {
    const response = new Response();
    const { supabaseClient } = getSupabaseServerClient(request);

    const authResult = await requireAuthenticatedUser(supabaseClient);
    if (!authResult) {
      // This shouldn't happen due to redirect, but for type safety
      throw new Response("Unauthorized", { status: 401 });
    }

    const { user, supabaseUser } = authResult;

    try {
      const result = await actualLoader({
        request,
        params,
        context,
        user,
        supabaseUser,
        supabaseClient,
      });

      if (result instanceof Response) {
        return result;
      }

      return new Response(JSON.stringify(result), {
        headers: {
          ...response.headers,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      if (error instanceof Response) {
        throw error; // Re-throw redirect responses
      }
      console.error("Loader error:", error);
      throw error;
    }
  };
}

/**
 * Higher-order function to wrap actions with authentication
 * @param actionOrRoles - Either the action function or allowed roles array
 * @param action - The action function (if roles provided as first param)
 */
export function withAuthAction<T = any>(
  actionOrRoles:
    | ((args: {
        request: Request;
        params: any;
        context?: any;
        user: any;
        supabaseUser: any;
        supabaseClient: any;
      }) => Promise<T>)
    | string[],
  action?: (args: {
    request: Request;
    params: any;
    context?: any;
    user: any;
    supabaseUser: any;
    supabaseClient: any;
  }) => Promise<T>
): ActionFunction {
  // Handle overloaded function signature
  if (Array.isArray(actionOrRoles)) {
    // withAuthAction(allowedRoles, action)
    if (!action) {
      throw new Error(
        "Action function is required when providing allowed roles"
      );
    }
    return withAuthActionAndRole(actionOrRoles, action);
  }

  // Handle single parameter: withAuthAction(action)
  const actualAction = actionOrRoles;
  return async ({ request, params, context }) => {
    const { supabaseClient } = getSupabaseServerClient(request);

    const authResult = await requireAuthenticatedUser(supabaseClient);
    if (!authResult) {
      throw new Response("Unauthorized", { status: 401 });
    }

    const { user, supabaseUser } = authResult;

    try {
      const result = await actualAction({
        request,
        params,
        context,
        user,
        supabaseUser,
        supabaseClient,
      });

      return result;
    } catch (error) {
      if (error instanceof Response) {
        throw error; // Re-throw redirect responses
      }
      console.error("Action error:", error);
      throw error;
    }
  };
}

/**
 * Simple loader for routes that only need basic auth
 * Returns user data in the format expected by existing components
 */
export const createAuthLoader = (): LoaderFunction => {
  return withAuth(async ({ user, supabaseClient }) => {
    return { user };
  });
};

/**
 * Loader for login/register pages that redirects if already logged in
 */
export function withGuestOnly<T = any>(
  loader?: (args: {
    request: Request;
    params: any;
    context?: any;
  }) => Promise<T>
): LoaderFunction {
  return async ({ request, params, context }) => {
    const { supabaseClient } = getSupabaseServerClient(request);
    await checkIfLoggedIn(supabaseClient);

    if (loader) {
      return loader({ request, params, context });
    }

    return {};
  };
}

/**
 * Utility to invalidate user auth cache when data changes
 * Call this after user profile updates, team changes, etc.
 */
export function invalidateUserAuth(userId?: string) {
  clearAuthCache(userId);
}

/**
 * Utility for role-based access control
 */
export function requireRole(allowedRoles: string[]) {
  return (args: { user: any }) => {
    if (!allowedRoles.includes(args.user.role)) {
      throw new Response(
        JSON.stringify({
          error: "Access denied. Insufficient permissions.",
          requiredRoles: allowedRoles,
          userRole: args.user.role
        }), 
        {
          status: 422,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  };
}

/**
 * Enhanced loader that includes role checking
 * @param allowedRoles - Array of allowed roles or use AllowedRoles constants
 * @param loader - The loader function to execute
 */
export function withAuthAndRole<T = any>(
  allowedRoles: string[],
  loader: (args: {
    request: Request;
    params: any;
    context?: any;
    user: any;
    supabaseUser: any;
    supabaseClient: any;
  }) => Promise<T>
): LoaderFunction {
  return withAuth(async (args) => {
    requireRole(allowedRoles)(args);
    return loader(args);
  });
}

/**
 * Enhanced action that includes role checking
 * @param allowedRoles - Array of allowed roles or use AllowedRoles constants
 * @param action - The action function to execute
 */
export function withAuthActionAndRole<T = any>(
  allowedRoles: string[],
  action: (args: {
    request: Request;
    params: any;
    context?: any;
    user: any;
    supabaseUser: any;
    supabaseClient: any;
  }) => Promise<T>
): ActionFunction {
  return withAuthAction(async (args) => {
    requireRole(allowedRoles)(args);
    return action(args);
  });
}

/**
 * Create a basic dashboard layout loader
 */
export const dashboardLayoutLoader = createAuthLoader();
