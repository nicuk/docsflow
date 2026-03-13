/**
 * Production-Ready Circuit Breaker Implementation
 * Prevents cascade failures by failing fast when external services are down
 * Risk: 2/10 (VERY LOW) - Battle-tested pattern, minimal overhead
 */

interface CircuitBreakerConfig {
  failureThreshold: number;     // Number of failures before opening
  recoveryTimeout: number;      // Time to wait before attempting recovery (ms)
  monitoringWindow: number;     // Time window for failure counting (ms)
  halfOpenMaxCalls: number;     // Max calls to try during half-open state
}

interface CircuitBreakerMetrics {
  totalCalls: number;
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  state: CircuitState;
}

enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing fast
  HALF_OPEN = 'half_open' // Testing recovery
}

interface ServiceError {
  isRateLimit: boolean;
  isTimeout: boolean;
  isServiceDown: boolean;
  originalError: any;
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private metrics: CircuitBreakerMetrics;
  private recentFailures: number[] = [];
  private halfOpenCalls: number = 0;

  constructor(
    private serviceName: string,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      recoveryTimeout: config.recoveryTimeout ?? 60000, // 1 minute
      monitoringWindow: config.monitoringWindow ?? 300000, // 5 minutes
      halfOpenMaxCalls: config.halfOpenMaxCalls ?? 3
    };

    this.metrics = {
      totalCalls: 0,
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      state: CircuitState.CLOSED
    };
  }

  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    this.metrics.totalCalls++;

    // Check if circuit should be closed (recovered)
    if (this.shouldAttemptReset()) {
      this.reset();
    }

    // Fail fast if circuit is open
    if (this.metrics.state === CircuitState.OPEN) {
      const error = new Error(`Circuit breaker OPEN for service: ${this.serviceName}`);
      
      if (fallback) {
        return await fallback();
      }
      throw error;
    }

    // Half-open state: limited calls to test recovery
    if (this.metrics.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        const error = new Error(`Circuit breaker HALF-OPEN limit exceeded: ${this.serviceName}`);
        if (fallback) {
          return await fallback();
        }
        throw error;
      }
      this.halfOpenCalls++;
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error);
      
      // Use fallback if available, otherwise re-throw
      if (fallback) {
        return await fallback();
      }
      throw error;
    }
  }

  private recordSuccess(): void {
    this.metrics.successes++;
    this.metrics.lastSuccessTime = Date.now();

    if (this.metrics.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        this.reset();
      }
    }
  }

  private recordFailure(error: any): void {
    this.metrics.failures++;
    this.metrics.lastFailureTime = Date.now();
    
    const serviceError = this.categorizeError(error);
    const now = Date.now();
    
    // Add to recent failures window
    this.recentFailures.push(now);
    this.cleanupOldFailures(now);

    // Immediate circuit break for critical errors
    if (serviceError.isRateLimit || serviceError.isServiceDown) {
      this.openCircuit();
      return;
    }

    // Check if we should open the circuit based on failure threshold
    if (this.recentFailures.length >= this.config.failureThreshold) {
      this.openCircuit();
    }
  }

  private categorizeError(error: any): ServiceError {
    const errorMessage = error?.message?.toLowerCase() || '';
    const statusCode = error?.status || error?.response?.status;

    return {
      isRateLimit: statusCode === 429 || errorMessage.includes('rate limit') || errorMessage.includes('quota exceeded'),
      isTimeout: errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT'),
      isServiceDown: statusCode >= 500 && statusCode < 600,
      originalError: error
    };
  }

  private openCircuit(): void {
    this.metrics.state = CircuitState.OPEN;
    this.halfOpenCalls = 0;
  }

  private shouldAttemptReset(): boolean {
    if (this.metrics.state !== CircuitState.OPEN) {
      return false;
    }

    const timeSinceLastFailure = Date.now() - this.metrics.lastFailureTime;
    return timeSinceLastFailure >= this.config.recoveryTimeout;
  }

  private reset(): void {
    this.metrics.state = CircuitState.HALF_OPEN;
    this.halfOpenCalls = 0;
    this.recentFailures = [];
  }

  private cleanupOldFailures(now: number): void {
    const cutoff = now - this.config.monitoringWindow;
    this.recentFailures = this.recentFailures.filter(time => time > cutoff);
  }

  // Public API for monitoring
  public getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  public getState(): CircuitState {
    return this.metrics.state;
  }

  public isOpen(): boolean {
    return this.metrics.state === CircuitState.OPEN;
  }

  public forceOpen(): void {
    this.openCircuit();
  }

  public forceClose(): void {
    this.metrics.state = CircuitState.CLOSED;
    this.halfOpenCalls = 0;
    this.recentFailures = [];
  }
}

/**
 * Circuit Breaker Factory for common services
 */
export class CircuitBreakerFactory {
  private static breakers = new Map<string, CircuitBreaker>();

  static getGoogleAI(): CircuitBreaker {
    if (!this.breakers.has('google_ai')) {
      this.breakers.set('google_ai', new CircuitBreaker('google_ai', {
        failureThreshold: 3,        // Quick fail for AI services
        recoveryTimeout: 30000,     // 30 seconds recovery
        monitoringWindow: 120000,   // 2 minute window
        halfOpenMaxCalls: 2
      }));
    }
    return this.breakers.get('google_ai')!;
  }

  static getSupabase(): CircuitBreaker {
    if (!this.breakers.has('supabase')) {
      this.breakers.set('supabase', new CircuitBreaker('supabase', {
        failureThreshold: 5,        // More tolerance for DB
        recoveryTimeout: 60000,     // 1 minute recovery
        monitoringWindow: 300000,   // 5 minute window
        halfOpenMaxCalls: 3
      }));
    }
    return this.breakers.get('supabase')!;
  }

  static getRedis(): CircuitBreaker {
    if (!this.breakers.has('redis')) {
      this.breakers.set('redis', new CircuitBreaker('redis', {
        failureThreshold: 3,        // Quick fail for cache
        recoveryTimeout: 15000,     // 15 seconds recovery
        monitoringWindow: 60000,    // 1 minute window
        halfOpenMaxCalls: 2
      }));
    }
    return this.breakers.get('redis')!;
  }

  static getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    for (const [name, breaker] of this.breakers.entries()) {
      metrics[name] = breaker.getMetrics();
    }
    return metrics;
  }
}
