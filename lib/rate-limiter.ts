/**
 * SURGICAL FIX: Rate Limiting for Authentication
 * 
 * Solves the lack of rate limiting protection identified in tests
 * by implementing client-side and server-side rate limiting
 */

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetTime: number;
  blocked: boolean;
  blockUntil?: number;
}

export class RateLimiter {
  private static readonly DEFAULT_CONFIG: RateLimitConfig = {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000 // 30 minutes
  };

  private static attempts: Map<string, { count: number; firstAttempt: number; blockedUntil?: number }> = new Map();

  /**
   * Check if an action is rate limited
   */
  static checkRateLimit(key: string, config: Partial<RateLimitConfig> = {}): RateLimitResult {
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
    const now = Date.now();
    const record = this.attempts.get(key);

    // Check if currently blocked
    if (record?.blockedUntil && now < record.blockedUntil) {
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: record.blockedUntil,
        blocked: true,
        blockUntil: record.blockedUntil
      };
    }

    // Clean up expired records
    if (record && (now - record.firstAttempt) > fullConfig.windowMs) {
      this.attempts.delete(key);
    }

    const currentRecord = this.attempts.get(key);
    
    if (!currentRecord) {
      // First attempt in window
      this.attempts.set(key, {
        count: 1,
        firstAttempt: now
      });

      return {
        allowed: true,
        remainingAttempts: fullConfig.maxAttempts - 1,
        resetTime: now + fullConfig.windowMs,
        blocked: false
      };
    }

    // Check if within rate limit
    if (currentRecord.count < fullConfig.maxAttempts) {
      currentRecord.count++;
      
      return {
        allowed: true,
        remainingAttempts: fullConfig.maxAttempts - currentRecord.count,
        resetTime: currentRecord.firstAttempt + fullConfig.windowMs,
        blocked: false
      };
    }

    // Rate limit exceeded - block user
    currentRecord.blockedUntil = now + fullConfig.blockDurationMs;
    
    console.warn(`🚨 [RATE-LIMITER] Key ${key} has been blocked until ${new Date(currentRecord.blockedUntil).toISOString()}`);

    return {
      allowed: false,
      remainingAttempts: 0,
      resetTime: currentRecord.blockedUntil,
      blocked: true,
      blockUntil: currentRecord.blockedUntil
    };
  }

  /**
   * Record a failed attempt
   */
  static recordFailedAttempt(key: string, config: Partial<RateLimitConfig> = {}): RateLimitResult {
    return this.checkRateLimit(key, config);
  }

  /**
   * Record a successful attempt (resets the counter)
   */
  static recordSuccessfulAttempt(key: string): void {
    this.attempts.delete(key);
    console.log(`✅ [RATE-LIMITER] Successful attempt for ${key} - counter reset`);
  }

  /**
   * Get current status without incrementing
   */
  static getStatus(key: string, config: Partial<RateLimitConfig> = {}): RateLimitResult {
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      return {
        allowed: true,
        remainingAttempts: fullConfig.maxAttempts,
        resetTime: now + fullConfig.windowMs,
        blocked: false
      };
    }

    // Check if currently blocked
    if (record.blockedUntil && now < record.blockedUntil) {
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: record.blockedUntil,
        blocked: true,
        blockUntil: record.blockedUntil
      };
    }

    // Check if window has expired
    if ((now - record.firstAttempt) > fullConfig.windowMs) {
      return {
        allowed: true,
        remainingAttempts: fullConfig.maxAttempts,
        resetTime: now + fullConfig.windowMs,
        blocked: false
      };
    }

    return {
      allowed: record.count < fullConfig.maxAttempts,
      remainingAttempts: Math.max(0, fullConfig.maxAttempts - record.count),
      resetTime: record.firstAttempt + fullConfig.windowMs,
      blocked: false
    };
  }

  /**
   * Clear rate limit for a specific key
   */
  static clearRateLimit(key: string): void {
    this.attempts.delete(key);
    console.log(`🧹 [RATE-LIMITER] Cleared rate limit for ${key}`);
  }

  /**
   * Clear all rate limits (for admin use)
   */
  static clearAllRateLimits(): void {
    this.attempts.clear();
    console.log('🧹 [RATE-LIMITER] Cleared all rate limits');
  }

  /**
   * Get a rate limit key for login attempts by IP/email
   */
  static getLoginKey(email: string, ip?: string): string {
    // Use email as primary key, fallback to IP if available
    const identifier = email || ip || 'unknown';
    return `login:${identifier}`;
  }

  /**
   * Get time remaining until unblocked (in seconds)
   */
  static getTimeUntilUnblocked(key: string): number {
    const record = this.attempts.get(key);
    if (!record?.blockedUntil) return 0;
    
    const remaining = Math.max(0, record.blockedUntil - Date.now());
    return Math.ceil(remaining / 1000);
  }
}

// Export singleton for easy use
export const rateLimiter = RateLimiter;