/**
 * Test utilities for the new authentication system
 */

import { getAuthCacheStats, cleanupAuthCache } from './auth.server';

export interface AuthTestResult {
  success: boolean;
  message: string;
  performance?: {
    oldPattern: number;
    newPattern: number;
    improvement: number;
  };
}

/**
 * Mock Supabase client for testing
 */
export function createMockSupabaseClient(mockUser: any = null, delay = 50) {
  let callCount = 0;
  
  return {
    auth: {
      getUser: async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        if (!mockUser) {
          return { data: { user: null }, error: null };
        }
        
        return { 
          data: { user: mockUser }, 
          error: null 
        };
      }
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          limit: () => ({
            single: async () => {
              callCount++;
              await new Promise(resolve => setTimeout(resolve, delay));
              
              if (table === 'users') {
                return {
                  data: {
                    id: mockUser.id,
                    name: 'Test User',
                    email: 'test@example.com',
                    role: 'ADMIN',
                    current_team: 'team-1'
                  },
                  error: null
                };
              }
              
              if (table === 'team_memberships') {
                return {
                  data: [{ team_id: 'team-1', role: 'ADMIN' }],
                  error: null
                };
              }
              
              return { data: [], error: null };
            })
          }),
          in: () => ({
            select: async () => {
              callCount++;
              await new Promise(resolve => setTimeout(resolve, delay));
              return { data: [{ id: 'team-1', name: 'Test Team' }], error: null };
            }
          })
        }),
        order: () => ({
          select: async () => {
            callCount++;
            await new Promise(resolve => setTimeout(resolve, delay));
            return { data: [{ id: 'team-1', name: 'Test Team' }], error: null };
          }
        })
      })
    }),
    getCallCount: () => callCount,
    resetCallCount: () => { callCount = 0; }
  };
}

/**
 * Test authentication caching performance
 */
export async function testAuthCaching(): Promise<AuthTestResult> {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const client = createMockSupabaseClient(mockUser, 10);
  
  try {
    // Import here to avoid circular dependencies
    const { requireAuthenticatedUser } = await import('./auth.server');
    
    // Test 1: First call (cache miss)
    const start1 = performance.now();
    const result1 = await requireAuthenticatedUser(client);
    const time1 = performance.now() - start1;
    const calls1 = client.getCallCount();
    
    if (!result1) {
      return { success: false, message: 'First auth call failed' };
    }
    
    // Test 2: Second call (cache hit)
    const start2 = performance.now();
    const result2 = await requireAuthenticatedUser(client);
    const time2 = performance.now() - start2;
    const totalCalls = client.getCallCount();
    
    if (!result2) {
      return { success: false, message: 'Second auth call failed' };
    }
    
    // Cache should have prevented additional calls
    const additionalCalls = totalCalls - calls1;
    
    if (additionalCalls > 0) {
      return { 
        success: false, 
        message: `Cache failed: ${additionalCalls} additional calls made` 
      };
    }
    
    const improvement = ((time1 - time2) / time1) * 100;
    
    return {
      success: true,
      message: `Auth caching working correctly. ${improvement.toFixed(1)}% faster on second call.`,
      performance: {
        oldPattern: time1,
        newPattern: time2,
        improvement
      }
    };
    
  } catch (error) {
    return { 
      success: false, 
      message: `Auth caching test failed: ${error}` 
    };
  }
}

/**
 * Test cache invalidation
 */
export async function testCacheInvalidation(): Promise<AuthTestResult> {
  const mockUser = { id: 'user-456', email: 'test2@example.com' };
  const client = createMockSupabaseClient(mockUser, 5);
  
  try {
    const { requireAuthenticatedUser, clearAuthCache } = await import('./auth.server');
    
    // Fill cache
    await requireAuthenticatedUser(client);
    const callsAfterFirst = client.getCallCount();
    
    // Second call should be cached
    await requireAuthenticatedUser(client);
    const callsAfterSecond = client.getCallCount();
    
    if (callsAfterSecond > callsAfterFirst) {
      return {
        success: false,
        message: 'Cache not working - calls increased'
      };
    }
    
    // Clear cache and try again
    clearAuthCache(mockUser.id);
    await requireAuthenticatedUser(client);
    const callsAfterClear = client.getCallCount();
    
    if (callsAfterClear <= callsAfterSecond) {
      return {
        success: false,
        message: 'Cache invalidation failed - no new calls made'
      };
    }
    
    return {
      success: true,
      message: 'Cache invalidation working correctly'
    };
    
  } catch (error) {
    return { 
      success: false, 
      message: `Cache invalidation test failed: ${error}` 
    };
  }
}

/**
 * Test cache statistics
 */
export function testCacheStats(): AuthTestResult {
  try {
    const stats = getAuthCacheStats();
    
    if (typeof stats.totalEntries !== 'number' || 
        typeof stats.activeEntries !== 'number' ||
        typeof stats.cacheSize !== 'number') {
      return {
        success: false,
        message: 'Cache stats returning invalid data'
      };
    }
    
    return {
      success: true,
      message: `Cache stats working. Entries: ${stats.totalEntries}, Active: ${stats.activeEntries}`
    };
    
  } catch (error) {
    return { 
      success: false, 
      message: `Cache stats test failed: ${error}` 
    };
  }
}

/**
 * Run all authentication tests
 */
export async function runAllAuthTests(): Promise<AuthTestResult[]> {
  console.log('🔐 Running authentication system tests...');
  
  const results: AuthTestResult[] = [];
  
  // Test 1: Cache performance
  console.log('Testing auth caching performance...');
  results.push(await testAuthCaching());
  
  // Test 2: Cache invalidation
  console.log('Testing cache invalidation...');
  results.push(await testCacheInvalidation());
  
  // Test 3: Cache statistics
  console.log('Testing cache statistics...');
  results.push(testCacheStats());
  
  // Cleanup
  cleanupAuthCache();
  
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Auth tests complete: ${successCount}/${results.length} passed`);
  
  return results;
}

/**
 * Performance comparison between old and new auth patterns
 */
export async function compareAuthPerformance(iterations = 10): Promise<{
  oldPattern: number;
  newPattern: number;
  improvement: string;
  callsReduction: string;
}> {
  const mockUser = { id: 'perf-test', email: 'perf@test.com' };
  
  // Test old pattern (multiple calls)
  const oldClient = createMockSupabaseClient(mockUser, 20);
  const oldStart = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    // Simulate old pattern: requireUser + getAppUser + multiple DB calls
    await oldClient.auth.getUser();
    await oldClient.from('users').select().eq('id', mockUser.id).limit(1).single();
    await oldClient.from('team_memberships').select().eq('user_id', mockUser.id);
    await oldClient.from('teams').select().in('id', ['team-1']).select();
  }
  
  const oldTime = performance.now() - oldStart;
  const oldCalls = oldClient.getCallCount();
  
  // Test new pattern (cached)
  const { requireAuthenticatedUser } = await import('./auth.server');
  const newClient = createMockSupabaseClient(mockUser, 20);
  const newStart = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    await requireAuthenticatedUser(newClient);
  }
  
  const newTime = performance.now() - newStart;
  const newCalls = newClient.getCallCount();
  
  const timeImprovement = ((oldTime - newTime) / oldTime * 100).toFixed(1);
  const callsReduction = ((oldCalls - newCalls) / oldCalls * 100).toFixed(1);
  
  return {
    oldPattern: oldTime,
    newPattern: newTime,
    improvement: `${timeImprovement}%`,
    callsReduction: `${callsReduction}%`
  };
}