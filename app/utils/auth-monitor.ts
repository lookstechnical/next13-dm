interface AuthMetrics {
  totalRequests: number;
  successfulRequests: number;
  rateLimitedRequests: number;
  cachedResponses: number;
  errors: number;
  lastError?: string;
  lastErrorTime?: number;
  averageResponseTime: number;
  requestTimes: number[];
}

/**
 * Auth monitoring service to track performance and issues
 */
export class AuthMonitor {
  private static metrics: AuthMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    rateLimitedRequests: 0,
    cachedResponses: 0,
    errors: 0,
    averageResponseTime: 0,
    requestTimes: []
  };

  private static readonly MAX_REQUEST_TIMES = 100; // Keep last 100 request times

  /**
   * Record a successful auth request
   */
  static recordSuccess(responseTime: number, fromCache: boolean = false): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    
    if (fromCache) {
      this.metrics.cachedResponses++;
    }
    
    this.recordResponseTime(responseTime);
  }

  /**
   * Record a rate limited request
   */
  static recordRateLimit(responseTime: number): void {
    this.metrics.totalRequests++;
    this.metrics.rateLimitedRequests++;
    this.recordResponseTime(responseTime);
  }

  /**
   * Record an error
   */
  static recordError(error: string, responseTime: number): void {
    this.metrics.totalRequests++;
    this.metrics.errors++;
    this.metrics.lastError = error;
    this.metrics.lastErrorTime = Date.now();
    this.recordResponseTime(responseTime);
  }

  /**
   * Record response time and update average
   */
  private static recordResponseTime(responseTime: number): void {
    this.metrics.requestTimes.push(responseTime);
    
    // Keep only last N request times
    if (this.metrics.requestTimes.length > this.MAX_REQUEST_TIMES) {
      this.metrics.requestTimes.shift();
    }
    
    // Calculate average
    this.metrics.averageResponseTime = 
      this.metrics.requestTimes.reduce((sum, time) => sum + time, 0) / 
      this.metrics.requestTimes.length;
  }

  /**
   * Get current metrics
   */
  static getMetrics(): AuthMetrics & {
    successRate: number;
    cacheHitRate: number;
    errorRate: number;
    rateLimitRate: number;
  } {
    const total = this.metrics.totalRequests || 1; // Avoid division by zero
    
    return {
      ...this.metrics,
      successRate: (this.metrics.successfulRequests / total) * 100,
      cacheHitRate: (this.metrics.cachedResponses / total) * 100,
      errorRate: (this.metrics.errors / total) * 100,
      rateLimitRate: (this.metrics.rateLimitedRequests / total) * 100
    };
  }

  /**
   * Reset metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      rateLimitedRequests: 0,
      cachedResponses: 0,
      errors: 0,
      averageResponseTime: 0,
      requestTimes: []
    };
  }

  /**
   * Get health status based on metrics
   */
  static getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const metrics = this.getMetrics();
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check error rate
    if (metrics.errorRate > 20) {
      issues.push(`High error rate: ${metrics.errorRate.toFixed(1)}%`);
      status = 'critical';
    } else if (metrics.errorRate > 5) {
      issues.push(`Elevated error rate: ${metrics.errorRate.toFixed(1)}%`);
      status = 'warning';
    }

    // Check rate limit rate
    if (metrics.rateLimitRate > 10) {
      issues.push(`High rate limit rate: ${metrics.rateLimitRate.toFixed(1)}%`);
      recommendations.push('Consider increasing cache TTL or reducing auth frequency');
      status = 'critical';
    } else if (metrics.rateLimitRate > 2) {
      issues.push(`Elevated rate limit rate: ${metrics.rateLimitRate.toFixed(1)}%`);
      recommendations.push('Monitor auth request patterns');
      status = status === 'critical' ? 'critical' : 'warning';
    }

    // Check cache hit rate
    if (metrics.cacheHitRate < 30) {
      issues.push(`Low cache hit rate: ${metrics.cacheHitRate.toFixed(1)}%`);
      recommendations.push('Consider increasing cache TTL or optimizing cache keys');
    }

    // Check average response time
    if (metrics.averageResponseTime > 2000) {
      issues.push(`High average response time: ${metrics.averageResponseTime.toFixed(0)}ms`);
      recommendations.push('Check network connectivity or database performance');
      status = status === 'critical' ? 'critical' : 'warning';
    }

    // Check for recent errors
    if (metrics.lastErrorTime && Date.now() - metrics.lastErrorTime < 60000) {
      issues.push(`Recent error: ${metrics.lastError}`);
    }

    // Positive recommendations
    if (metrics.cacheHitRate > 70) {
      recommendations.push('Good cache performance - consider maintaining current settings');
    }

    if (issues.length === 0) {
      recommendations.push('Auth system performing well');
    }

    return { status, issues, recommendations };
  }

  /**
   * Log metrics summary
   */
  static logSummary(): void {
    const metrics = this.getMetrics();
    const health = this.getHealthStatus();
    
    console.log(`
=== Auth Monitor Summary ===
Status: ${health.status.toUpperCase()}
Total Requests: ${metrics.totalRequests}
Success Rate: ${metrics.successRate.toFixed(1)}%
Cache Hit Rate: ${metrics.cacheHitRate.toFixed(1)}%
Error Rate: ${metrics.errorRate.toFixed(1)}%
Rate Limit Rate: ${metrics.rateLimitRate.toFixed(1)}%
Avg Response Time: ${metrics.averageResponseTime.toFixed(0)}ms

Issues: ${health.issues.length > 0 ? health.issues.join(', ') : 'None'}
Recommendations: ${health.recommendations.join(', ')}
===========================
    `.trim());
  }

  /**
   * Start periodic monitoring
   */
  static startMonitoring(intervalMinutes: number = 5): NodeJS.Timeout {
    return setInterval(() => {
      const health = this.getHealthStatus();
      
      if (health.status !== 'healthy') {
        console.warn(`[AuthMonitor] Health check: ${health.status}`);
        this.logSummary();
      }
    }, intervalMinutes * 60 * 1000);
  }
}

/**
 * Wrapper function to time auth operations
 */
export async function timeAuthOperation<T>(
  operation: () => Promise<T>,
  operationType: 'success' | 'rate_limit' | 'error',
  fromCache: boolean = false,
  errorMessage?: string
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await operation();
    const responseTime = Date.now() - startTime;
    
    if (operationType === 'success') {
      AuthMonitor.recordSuccess(responseTime, fromCache);
    } else if (operationType === 'rate_limit') {
      AuthMonitor.recordRateLimit(responseTime);
    }
    
    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    AuthMonitor.recordError(errorMessage || String(error), responseTime);
    throw error;
  }
}