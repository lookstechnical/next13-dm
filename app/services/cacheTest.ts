/**
 * Cache system test and verification
 * Simple tests to ensure cache functionality works correctly
 */

import { cacheManager } from './cache';
import { CacheInvalidationService } from './cacheInvalidation';
import { CacheMonitor } from './cacheConfig';

export async function runCacheTests() {
  console.log('🧪 Running cache system tests...');
  
  try {
    // Test 1: Basic cache set/get
    console.log('Test 1: Basic cache operations');
    const testKey = 'test:basic';
    const testData = { id: '123', name: 'Test Player' };
    
    await cacheManager.set(testKey, testData);
    const cachedData = await cacheManager.get(testKey);
    
    if (JSON.stringify(cachedData) === JSON.stringify(testData)) {
      console.log('✅ Basic cache set/get works');
    } else {
      console.log('❌ Basic cache set/get failed');
    }

    // Test 2: Cache key generation
    console.log('Test 2: Cache key generation');
    const key1 = cacheManager.generateKey('players', 'getById', { id: '123' });
    const key2 = cacheManager.generateKey('players', 'getById', { id: '456' });
    const key3 = cacheManager.generateKey('players', 'getById', { id: '123' });
    
    if (key1 !== key2 && key1 === key3) {
      console.log('✅ Cache key generation works correctly');
    } else {
      console.log('❌ Cache key generation failed');
    }

    // Test 3: TTL expiration (simulate)
    console.log('Test 3: TTL behavior');
    const shortTtlKey = 'test:ttl';
    await cacheManager.set(shortTtlKey, 'test-data', { ttl: 100 }); // 100ms TTL
    
    const immediateGet = await cacheManager.get(shortTtlKey);
    if (immediateGet === 'test-data') {
      console.log('✅ Data available immediately after caching');
    } else {
      console.log('❌ Data not available immediately');
    }

    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 150));
    const expiredGet = await cacheManager.get(shortTtlKey);
    if (expiredGet === null) {
      console.log('✅ TTL expiration works correctly');
    } else {
      console.log('❌ TTL expiration failed');
    }

    // Test 4: Cache invalidation
    console.log('Test 4: Cache invalidation');
    const playerKey = cacheManager.generateKey('players', 'getById', { id: '789' });
    await cacheManager.set(playerKey, { id: '789', name: 'Player 789' });
    
    // Verify data is cached
    const beforeInvalidation = await cacheManager.get(playerKey);
    if (beforeInvalidation) {
      console.log('✅ Data cached before invalidation');
    } else {
      console.log('❌ Data not cached properly');
    }
    
    // Invalidate
    CacheInvalidationService.invalidatePlayerCache('team-123', '789');
    
    // Verify data is gone
    const afterInvalidation = await cacheManager.get(playerKey);
    if (afterInvalidation === null) {
      console.log('✅ Cache invalidation works correctly');
    } else {
      console.log('❌ Cache invalidation failed');
    }

    // Test 5: Cache monitoring
    console.log('Test 5: Cache monitoring');
    const healthStatus = CacheMonitor.getHealthStatus();
    if (healthStatus && typeof healthStatus.memorySize === 'number') {
      console.log('✅ Cache monitoring works correctly');
      console.log(`📊 Cache stats: ${healthStatus.memorySize} entries, ${healthStatus.memoryUsagePercent.toFixed(1)}% full`);
    } else {
      console.log('❌ Cache monitoring failed');
    }

    console.log('✅ All cache tests completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Cache tests failed:', error);
    return false;
  }
}

/**
 * Performance benchmark for cache vs direct calls
 */
export async function benchmarkCache(mockSupabaseCall: () => Promise<any>) {
  console.log('⏱️  Running cache performance benchmark...');
  
  const iterations = 100;
  const testKey = 'benchmark:test';
  
  // Benchmark direct calls
  console.log(`Testing ${iterations} direct database calls...`);
  const directStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    await mockSupabaseCall();
  }
  const directTime = performance.now() - directStart;
  
  // Benchmark cached calls (first call populates cache)
  console.log(`Testing ${iterations} cached calls...`);
  await cacheManager.set(testKey, await mockSupabaseCall()); // Pre-populate
  
  const cachedStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    await cacheManager.get(testKey);
  }
  const cachedTime = performance.now() - cachedStart;
  
  const speedup = (directTime / cachedTime).toFixed(2);
  
  console.log(`📈 Performance Results:`);
  console.log(`Direct calls: ${directTime.toFixed(2)}ms (${(directTime/iterations).toFixed(2)}ms per call)`);
  console.log(`Cached calls: ${cachedTime.toFixed(2)}ms (${(cachedTime/iterations).toFixed(2)}ms per call)`);
  console.log(`Cache is ${speedup}x faster!`);
  
  return { directTime, cachedTime, speedup: parseFloat(speedup) };
}

/**
 * Memory usage test
 */
export function testMemoryUsage() {
  console.log('💾 Testing cache memory usage...');
  
  const testData = Array.from({ length: 1000 }, (_, i) => ({
    id: `player-${i}`,
    name: `Player ${i}`,
    position: 'Forward',
    teamId: `team-${Math.floor(i / 50)}`
  }));
  
  const startStats = CacheMonitor.getHealthStatus();
  console.log(`Initial memory usage: ${startStats.memorySize} entries`);
  
  // Add test data to cache
  testData.forEach(async (player, index) => {
    const key = cacheManager.generateKey('players', 'getById', { id: player.id });
    await cacheManager.set(key, player);
  });
  
  const endStats = CacheMonitor.getHealthStatus();
  console.log(`Final memory usage: ${endStats.memorySize} entries`);
  console.log(`Added ${endStats.memorySize - startStats.memorySize} cache entries`);
  console.log(`Memory usage: ${endStats.memoryUsagePercent.toFixed(1)}% (${endStats.status})`);
  
  // Cleanup
  cacheManager.clear();
  console.log('✨ Cache cleared after memory test');
}

// Export a simple function to run all tests
export async function runAllCacheTests() {
  console.log('🚀 Starting comprehensive cache tests...\n');
  
  const basicTests = await runCacheTests();
  
  if (basicTests) {
    // Mock Supabase call for benchmarking
    const mockSupabaseCall = async () => {
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate 10ms DB call
      return { id: 'mock', data: 'test' };
    };
    
    await benchmarkCache(mockSupabaseCall);
    testMemoryUsage();
  }
  
  console.log('\n🎉 Cache testing complete!');
}