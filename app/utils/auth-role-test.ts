/**
 * Test utilities for role-based authentication
 */

import { requireRole } from './auth-helpers';
import { AllowedRoles } from '../components/route-protections';

export interface RoleTestResult {
  success: boolean;
  message: string;
  role?: string;
  allowedRoles?: string[];
}

/**
 * Test role-based access control
 */
export function testRoleAccess(userRole: string, allowedRoles: string[]): RoleTestResult {
  const mockUser = { role: userRole };
  
  try {
    requireRole(allowedRoles)({ user: mockUser });
    
    return {
      success: true,
      message: `Access granted for ${userRole}`,
      role: userRole,
      allowedRoles
    };
  } catch (error) {
    if (error instanceof Response) {
      return {
        success: false,
        message: `Access denied for ${userRole}: ${error.status} - ${await error.text()}`,
        role: userRole,
        allowedRoles
      };
    }
    
    return {
      success: false,
      message: `Unexpected error: ${error}`,
      role: userRole,
      allowedRoles
    };
  }
}

/**
 * Run comprehensive role tests
 */
export async function runRoleTests(): Promise<RoleTestResult[]> {
  const results: RoleTestResult[] = [];
  
  console.log('🔒 Testing role-based access control...');
  
  // Test 1: Admin access
  results.push(testRoleAccess('ADMIN', AllowedRoles.adminOnly));
  results.push(testRoleAccess('COACH', AllowedRoles.adminOnly)); // Should fail
  
  // Test 2: Head of Department access
  results.push(testRoleAccess('HEAD_OF_DEPARTMENT', AllowedRoles.headOfDept));
  results.push(testRoleAccess('ADMIN', AllowedRoles.headOfDept)); // Should pass
  results.push(testRoleAccess('SCOUT', AllowedRoles.headOfDept)); // Should fail
  
  // Test 3: Coach access
  results.push(testRoleAccess('COACH', AllowedRoles.coach));
  results.push(testRoleAccess('HEAD_OF_DEPARTMENT', AllowedRoles.coach)); // Should pass
  results.push(testRoleAccess('SCOUT', AllowedRoles.coach)); // Should fail
  
  // Test 4: Scout access
  results.push(testRoleAccess('SCOUT', AllowedRoles.scout));
  results.push(testRoleAccess('ADMIN', AllowedRoles.scout)); // Should pass
  results.push(testRoleAccess('COACH', AllowedRoles.scout)); // Should fail
  
  // Test 5: All roles access
  results.push(testRoleAccess('COACH', AllowedRoles.all));
  results.push(testRoleAccess('SCOUT', AllowedRoles.all));
  results.push(testRoleAccess('HEAD_OF_DEPARTMENT', AllowedRoles.all));
  results.push(testRoleAccess('ADMIN', AllowedRoles.all));
  
  // Test 6: Invalid role
  results.push(testRoleAccess('INVALID_ROLE', AllowedRoles.all)); // Should fail
  
  const passCount = results.filter(r => r.success).length;
  const expectedPasses = 11; // Based on the tests above
  
  console.log(`✅ Role tests complete: ${passCount}/${results.length} passed`);
  console.log(`Expected passes: ${expectedPasses}, Actual passes: ${passCount}`);
  
  if (passCount === expectedPasses) {
    console.log('🎉 All role tests passed as expected!');
  } else {
    console.warn('⚠️  Some role tests failed unexpectedly');
  }
  
  return results;
}

/**
 * Test specific role scenario
 */
export function testRoleScenario(scenario: string, userRole: string, allowedRoles: string[]): void {
  console.log(`\n🧪 Testing scenario: ${scenario}`);
  console.log(`User role: ${userRole}`);
  console.log(`Allowed roles: ${allowedRoles.join(', ')}`);
  
  const result = testRoleAccess(userRole, allowedRoles);
  
  if (result.success) {
    console.log(`✅ ${result.message}`);
  } else {
    console.log(`❌ ${result.message}`);
  }
}

/**
 * Example usage of role testing
 */
export function runExampleRoleTests(): void {
  testRoleScenario('Admin accessing admin-only settings', 'ADMIN', AllowedRoles.adminOnly);
  testRoleScenario('Coach trying to access admin settings', 'COACH', AllowedRoles.adminOnly);
  testRoleScenario('Head of Dept accessing team management', 'HEAD_OF_DEPARTMENT', AllowedRoles.headOfDept);
  testRoleScenario('Scout accessing scouting reports', 'SCOUT', AllowedRoles.scout);
  testRoleScenario('Coach accessing coaching tools', 'COACH', AllowedRoles.coach);
}