/**
 * API Rate Limiter for handling 429 errors and implementing retry logic
 * Specifically designed for Gemini API quota management
 */

interface RateLimitConfig {
  maxRetries: number;
  baseDelay: number; // in ms
  maxDelay: number; // in ms
  backoffMultiplier: number;
}

interface RateLimitError {
  isRateLimit: boolean;
  retryAfter?: number; // seconds
  message: string;
}

export class APIRateLimiter {
  private defaultConfig: RateLimitConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2
  };

  /**
   * Execute an API call with rate limit handling and exponential backoff
   */
  async executeWithRetry<T>(
    apiCall: () => Promise<T>,
    config: Partial<RateLimitConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error as Error;
        const rateLimitInfo = this.parseRateLimitError(error);

        if (!rateLimitInfo.isRateLimit || attempt === finalConfig.maxRetries) {
          throw error; // Not a rate limit error or max retries reached
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
          finalConfig.maxDelay
        );

        // Use retry-after header if provided, otherwise use calculated delay
        const waitTime = rateLimitInfo.retryAfter 
          ? rateLimitInfo.retryAfter * 1000 
          : delay;

        console.warn(`[Rate Limiter] Attempt ${attempt + 1}/${finalConfig.maxRetries + 1} failed. Waiting ${waitTime}ms before retry...`);
        
        await this.sleep(waitTime);
      }
    }

    throw lastError;
  }

  /**
   * Parse error to determine if it's a rate limit error
   */
  private parseRateLimitError(error: any): RateLimitError {
    const errorMessage = error?.message || '';
    const isGeminiRateLimit = errorMessage.includes('429') || 
                              errorMessage.includes('Too Many Requests') ||
                              errorMessage.includes('quota') ||
                              errorMessage.includes('rate limit');

    if (!isGeminiRateLimit) {
      return { isRateLimit: false, message: errorMessage };
    }

    // Extract retry-after from Gemini error if available
    let retryAfter: number | undefined;
    
    // Check for RetryInfo in Google AI error structure
    if (error?.errorDetails) {
      const retryInfo = error.errorDetails.find((detail: any) => 
        detail['@type']?.includes('RetryInfo')
      );
      if (retryInfo?.retryDelay) {
        const match = retryInfo.retryDelay.match(/(\d+)s/);
        if (match) {
          retryAfter = parseInt(match[1]);
        }
      }
    }

    return {
      isRateLimit: true,
      retryAfter,
      message: `Rate limit exceeded. ${retryAfter ? `Retry after ${retryAfter}s` : 'Using exponential backoff'}`
    };
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a rate-limited version of a function
   */
  createRateLimitedFunction<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    config: Partial<RateLimitConfig> = {}
  ): T {
    return ((...args: Parameters<T>) => {
      return this.executeWithRetry(() => fn(...args), config);
    }) as T;
  }
}

// Export singleton instance
export const rateLimiter = new APIRateLimiter();

/**
 * Higher-order function to wrap any async function with rate limiting
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config: Partial<RateLimitConfig> = {}
): T {
  return rateLimiter.createRateLimitedFunction(fn, config);
}

/**
 * Specific rate limiter for Gemini API calls
 */
export const withGeminiRateLimit = <T extends (...args: any[]) => Promise<any>>(fn: T): T => {
  return withRateLimit(fn, {
    maxRetries: 3,
    baseDelay: 2000, // Start with 2s delay for Gemini
    maxDelay: 60000, // Max 1 minute wait
    backoffMultiplier: 2
  });
};
