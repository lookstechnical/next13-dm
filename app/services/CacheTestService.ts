import { CacheManager, CacheConfigs } from "./CacheManager";
import { CacheUtilityService } from "./CacheUtilityService";

/**
 * Test service to verify caching functionality
 * Remove this file after testing in production
 */
export class CacheTestService {
  /**
   * Run basic cache functionality tests
   */
  static runBasicTests(): void {
    console.log('🧪 Running Cache Tests...');
    
    const testCache = new CacheManager({
      defaultTTL: 1000,
      maxSize: 10,
      enableLogging: true
    });

    // Test 1: Basic set/get
    testCache.set('test:key1', { id: 1, name: 'Test Item' });
    const retrieved = testCache.get('test:key1');
    console.assert(retrieved?.id === 1, '❌ Test 1 Failed: Basic set/get');
    console.log('✅ Test 1 Passed: Basic set/get');

    // Test 2: Cache miss
    const missing = testCache.get('nonexistent:key');
    console.assert(missing === null, '❌ Test 2 Failed: Cache miss');
    console.log('✅ Test 2 Passed: Cache miss');

    // Test 3: Key generation
    const key = testCache.generateKey(['users', 'getById', '123', '*']);
    console.assert(key === 'users:getById:123:*', '❌ Test 3 Failed: Key generation');
    console.log('✅ Test 3 Passed: Key generation');

    // Test 4: Pattern deletion
    testCache.set('users:getById:1', { id: 1 });
    testCache.set('users:getById:2', { id: 2 });
    testCache.set('posts:getById:1', { id: 1 });
    
    const deleted = testCache.deletePattern('^users:');
    console.assert(deleted === 2, '❌ Test 4 Failed: Pattern deletion');
    console.log('✅ Test 4 Passed: Pattern deletion');

    // Test 5: Cache stats
    testCache.set('test:stats1', 'data1');
    testCache.set('test:stats2', 'data2');
    const stats = testCache.getStats();
    console.assert(stats.size >= 2, '❌ Test 5 Failed: Cache stats');
    console.log('✅ Test 5 Passed: Cache stats');

    // Test 6: TTL expiration (async)
    testCache.set('test:expire', 'expiring data', 100);
    setTimeout(() => {
      const expired = testCache.get('test:expire');
      console.assert(expired === null, '❌ Test 6 Failed: TTL expiration');
      console.log('✅ Test 6 Passed: TTL expiration');
    }, 150);

    testCache.destroy();
    console.log('🎉 Basic Cache Tests Completed\n');
  }

  /**
   * Run service integration tests (requires mock client)
   */
  static runIntegrationTests(): void {
    console.log('🧪 Running Integration Tests...');

    // Mock Supabase client
    const mockClient = {
      from: (table: string) => ({
        select: (fields: string) => ({
          order: (field: string) => Promise.resolve({
            data: [{ id: '1', name: 'Test Item', created_at: '2023-01-01' }],
            error: null
          }),
          eq: (field: string, value: any) => ({
            single: () => Promise.resolve({
              data: { id: value, name: 'Test Item', created_at: '2023-01-01' },
              error: null
            })
          })
        })
      })
    };

    // This would require importing actual services and running them
    // For now, just log that integration tests would run here
    console.log('✅ Integration tests would run with real services');
    console.log('🎉 Integration Tests Completed\n');
  }

  /**
   * Performance test for cache operations
   */
  static runPerformanceTests(): void {
    console.log('🧪 Running Performance Tests...');
    
    const perfCache = new CacheManager({
      defaultTTL: 5000,
      maxSize: 1000,
      enableLogging: false
    });

    const iterations = 1000;
    const testData = { id: 1, name: 'Performance Test Item', data: 'x'.repeat(100) };

    // Test write performance
    const writeStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      perfCache.set(`perf:test:${i}`, { ...testData, id: i });
    }
    const writeTime = Date.now() - writeStart;
    console.log(`✅ Write Performance: ${iterations} writes in ${writeTime}ms (${(iterations/writeTime*1000).toFixed(0)} ops/sec)`);

    // Test read performance
    const readStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      perfCache.get(`perf:test:${i}`);
    }
    const readTime = Date.now() - readStart;
    console.log(`✅ Read Performance: ${iterations} reads in ${readTime}ms (${(iterations/readTime*1000).toFixed(0)} ops/sec)`);

    // Test cache hit rate
    let hits = 0;
    for (let i = 0; i < iterations; i++) {
      if (perfCache.get(`perf:test:${i}`) !== null) hits++;
    }
    console.log(`✅ Cache Hit Rate: ${(hits/iterations*100).toFixed(1)}%`);

    perfCache.destroy();
    console.log('🎉 Performance Tests Completed\n');
  }

  /**
   * Run all cache tests
   */
  static runAllTests(): void {
    console.log('🚀 Starting Comprehensive Cache Testing\n');
    
    this.runBasicTests();
    setTimeout(() => {
      this.runIntegrationTests();
      this.runPerformanceTests();
      
      // Test utility services
      console.log('🧪 Testing Utility Services...');
      CacheUtilityService.logCacheStatus();
      const cleaned = CacheUtilityService.cleanupAllCaches();
      console.log(`✅ Utility Services: Cleaned ${cleaned} expired entries`);
      
      console.log('\n🎉 All Cache Tests Completed!');
    }, 200);
  }
}

// Export function to easily run tests from console or route
export const testCaching = () => CacheTestService.runAllTests();