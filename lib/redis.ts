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
    console.warn('Redis is not configured, using fallback value');
    return fallback;
  }
  
  try {
    return await operation();
  } catch (error) {
    console.error('Redis operation failed:', error);
    return fallback;
  }
};
