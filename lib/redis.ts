import { Redis } from '@upstash/redis';

// Only initialize Redis if environment variables are available
export const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN
    })
  : null;

// Helper function to safely use Redis
export const safeRedisOperation = async <T>(operation: () => Promise<T>, fallback: T): Promise<T> => {
  if (!redis) {
    console.warn('Redis is not configured - missing KV_REST_API_URL or KV_REST_API_TOKEN');
    console.warn('Available env vars:', {
      hasUrl: !!process.env.KV_REST_API_URL,
      hasToken: !!process.env.KV_REST_API_TOKEN,
      nodeEnv: process.env.NODE_ENV
    });
    return fallback;
  }
  
  try {
    const result = await operation();
    console.log('Redis operation successful');
    return result;
  } catch (error) {
    console.error('Redis operation failed:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    return fallback;
  }
};
