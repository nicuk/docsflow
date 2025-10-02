/**
 * RAG Response Caching Layer
 * Risk: 2/10 (LOW) - Fail-open pattern with error handling
 */

import { createHash } from 'crypto';

// Check if Redis client exists (we saw Redis in logs)
let redis: any = null;
try {
  redis = require('./redis-client').default || require('./redis-client').redis;
} catch (error) {
  console.warn('⚠️ [RAG CACHE] Redis not available, caching disabled');
}

const CACHE_ENABLED = process.env.RAG_CACHE_ENABLED !== 'false'; // Enabled by default
const CACHE_TTL = parseInt(process.env.RAG_CACHE_TTL || '300'); // 5 minutes default

/**
 * Generate cache key from query and tenant
 */
function generateCacheKey(query: string, tenantId: string): string {
  const queryHash = createHash('sha256')
    .update(query.toLowerCase().trim())
    .digest('hex')
    .substring(0, 16); // Use first 16 chars of hash
  
  return `rag:v1:${tenantId}:${queryHash}`;
}

/**
 * Get cached RAG response
 * Returns null if cache miss or error
 */
export async function getCachedRAGResponse(
  query: string, 
  tenantId: string
): Promise<any | null> {
  // Safety checks
  if (!CACHE_ENABLED || !redis) {
    return null;
  }

  if (!query || !tenantId) {
    console.warn('⚠️ [RAG CACHE] Invalid query or tenantId');
    return null;
  }

  try {
    const key = generateCacheKey(query, tenantId);
    const cached = await redis.get(key);
    
    if (cached) {
      console.log(`⚡ [RAG CACHE HIT] Returning cached response for: "${query.substring(0, 50)}..."`);
      const parsed = JSON.parse(cached);
      return {
        ...parsed,
        _cached: true, // Mark as cached for debugging
        _cacheTimestamp: Date.now()
      };
    }
    
    console.log(`❌ [RAG CACHE MISS] No cache for: "${query.substring(0, 50)}..."`);
    return null;
  } catch (error) {
    // Fail-open: If caching fails, just proceed without cache
    console.warn('⚠️ [RAG CACHE] Cache read failed, proceeding without cache:', error);
    return null;
  }
}

/**
 * Store RAG response in cache
 * Fails silently if error (fail-open pattern)
 */
export async function setCachedRAGResponse(
  query: string,
  tenantId: string,
  response: any,
  customTTL?: number
): Promise<void> {
  // Safety checks
  if (!CACHE_ENABLED || !redis) {
    return;
  }

  if (!query || !tenantId || !response) {
    console.warn('⚠️ [RAG CACHE] Invalid parameters for cache set');
    return;
  }

  try {
    const key = generateCacheKey(query, tenantId);
    const ttl = customTTL || CACHE_TTL;
    
    // Don't cache errors or low-confidence responses
    if (response.success === false || (response.confidence && response.confidence < 0.5)) {
      console.log(`⏭️ [RAG CACHE] Skipping cache for low-quality response`);
      return;
    }
    
    await redis.setex(key, ttl, JSON.stringify(response));
    console.log(`✅ [RAG CACHE STORED] Cached response for: "${query.substring(0, 50)}..." (TTL: ${ttl}s)`);
  } catch (error) {
    // Fail-open: If caching fails, just log and continue
    console.warn('⚠️ [RAG CACHE] Cache write failed, continuing:', error);
  }
}

/**
 * Invalidate cache for a tenant (e.g., after document upload)
 */
export async function invalidateTenantCache(tenantId: string): Promise<void> {
  if (!CACHE_ENABLED || !redis) {
    return;
  }

  try {
    const pattern = `rag:v1:${tenantId}:*`;
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️ [RAG CACHE] Invalidated ${keys.length} cached responses for tenant ${tenantId}`);
    }
  } catch (error) {
    console.warn('⚠️ [RAG CACHE] Cache invalidation failed:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(tenantId?: string): Promise<{
  enabled: boolean;
  totalKeys: number;
  tenantKeys?: number;
}> {
  if (!redis) {
    return { enabled: false, totalKeys: 0 };
  }

  try {
    const pattern = tenantId ? `rag:v1:${tenantId}:*` : 'rag:v1:*';
    const keys = await redis.keys(pattern);
    
    return {
      enabled: CACHE_ENABLED,
      totalKeys: keys.length,
      ...(tenantId && { tenantKeys: keys.length })
    };
  } catch (error) {
    console.warn('⚠️ [RAG CACHE] Failed to get stats:', error);
    return { enabled: CACHE_ENABLED, totalKeys: 0 };
  }
}

