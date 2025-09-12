/**
 * Examples of using the enhanced auth helpers with role-based access control
 */

import { withAuth, withAuthAction } from './auth-helpers';

// Import AllowedRoles from route protections for consistency
// import { AllowedRoles } from '~/components/route-protections';

/**
 * EXAMPLE 1: Simple auth without role checking (existing usage)
 */
export const basicLoader = withAuth(async ({ user, supabaseClient }) => {
  // Any authenticated user can access
  return { user };
});

/**
 * EXAMPLE 2: Auth with role checking - Admin only
 */
export const adminOnlyLoader = withAuth(['ADMIN'], async ({ user, supabaseClient }) => {
  // Only ADMIN role can access - throws 422 if not authorized
  return { adminData: 'secret admin stuff' };
});

/**
 * EXAMPLE 3: Auth with role checking - Multiple roles allowed
 */
export const headOfDeptLoader = withAuth(
  ['HEAD_OF_DEPARTMENT', 'ADMIN'], 
  async ({ user, supabaseClient }) => {
    // HEAD_OF_DEPARTMENT or ADMIN can access
    return { managementData: 'team management data' };
  }
);

/**
 * EXAMPLE 4: Using AllowedRoles constants (recommended)
 */
// export const coachLoader = withAuth(
//   AllowedRoles.coach, 
//   async ({ user, supabaseClient }) => {
//     // COACH, HEAD_OF_DEPARTMENT, or ADMIN can access
//     return { coachingData: 'training plans' };
//   }
// );

/**
 * EXAMPLE 5: Action with role checking
 */
export const deletePlayerAction = withAuthAction(
  ['ADMIN', 'HEAD_OF_DEPARTMENT'],
  async ({ request, user, supabaseClient }) => {
    // Only ADMIN or HEAD_OF_DEPARTMENT can delete players
    const formData = await request.formData();
    const playerId = formData.get('playerId');
    
    // Delete logic here...
    return { success: true };
  }
);

/**
 * EXAMPLE 6: Complex role logic in route
 */
export const complexRoleLoader = withAuth(async ({ user, supabaseClient }) => {
  // Custom role logic if needed
  if (!['ADMIN', 'HEAD_OF_DEPARTMENT'].includes(user.role)) {
    throw new Response("Access denied. Management role required.", { 
      status: 422 
    });
  }
  
  return { data: 'complex data' };
});

/**
 * EXAMPLE 7: Route-specific role checking
 */
export const teamSpecificLoader = withAuth(
  ['ADMIN', 'HEAD_OF_DEPARTMENT', 'COACH'],
  async ({ user, params, supabaseClient }) => {
    // Additional team-specific authorization
    const requestedTeamId = params.teamId;
    
    if (user.role !== 'ADMIN' && user.team?.id !== requestedTeamId) {
      throw new Response("Access denied. Team access required.", { 
        status: 422 
      });
    }
    
    return { teamData: 'team specific data' };
  }
);

/**
 * EXAMPLE 8: Scout-only access
 */
export const scoutLoader = withAuth(
  ['SCOUT', 'HEAD_OF_DEPARTMENT', 'ADMIN'],
  async ({ user, supabaseClient }) => {
    return { scoutingData: 'player evaluations' };
  }
);