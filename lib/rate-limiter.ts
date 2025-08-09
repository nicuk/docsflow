// Rate limiting utility for API endpoints
import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string;
}

// In-memory store for rate limiting (production should use Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function createRateLimit(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const key = `${ip}:${request.nextUrl.pathname}`;
    const now = Date.now();
    
    // Clean up expired entries
    for (const [k, v] of requestCounts.entries()) {
      if (now > v.resetTime) {
        requestCounts.delete(k);
      }
    }
    
    const current = requestCounts.get(key);
    
    if (!current) {
      // First request in window
      requestCounts.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return null; // Allow request
    }
    
    if (now > current.resetTime) {
      // Window expired, reset
      requestCounts.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return null; // Allow request
    }
    
    if (current.count >= config.maxRequests) {
      // Rate limit exceeded
      return NextResponse.json(
        { 
          success: false,
          error: config.message || 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED'
        },
        { status: 429 }
      );
    }
    
    // Increment counter
    current.count++;
    return null; // Allow request
  };
}

// Predefined rate limiters
export const tenantCreationLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 3, // 3 tenant creations per IP per 15 minutes
  message: 'Too many tenant creation attempts. Please try again later.'
});

export const authLimiter = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 10, // 10 auth attempts per IP per 5 minutes
  message: 'Too many authentication attempts. Please try again later.'
});

export const apiLimiter = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per IP per minute
  message: 'API rate limit exceeded. Please slow down.'
});
