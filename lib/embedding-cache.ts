import { redis, safeRedisOperation } from './redis';
import crypto from 'crypto';

interface CachedEmbedding {
  embedding: number[];
  model: string;
  timestamp: number;
  hit_count: number;
}

interface CacheMetrics {
  total_requests: number;
  cache_hits: number;
  cache_misses: number;
  hit_rate: number;
  avg_latency_ms: number;
  storage_size_mb: number;
}

export class EmbeddingCache {
  private readonly cachePrefix = 'embed:';
  private readonly ttlSeconds = 7 * 24 * 60 * 60; // 7 days
  private readonly maxCacheSize = 10000; // Maximum number of cached embeddings
  private metrics: CacheMetrics = {
    total_requests: 0,
    cache_hits: 0,
    cache_misses: 0,
    hit_rate: 0,
    avg_latency_ms: 0,
    storage_size_mb: 0
  };
  private latencies: number[] = [];

  /**
   * Generate a cache key for content
   */
  private generateCacheKey(content: string, model: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(`${model}:${content}`)
      .digest('hex')
      .substring(0, 16); // Use first 16 chars for shorter keys
    
    return `${this.cachePrefix}${model}:${hash}`;
  }

  /**
   * Get embedding from cache or generate new one
   */
  async getEmbedding(
    content: string,
    model: string,
    generateFn: () => Promise<number[]>
  ): Promise<{
    embedding: number[];
    fromCache: boolean;
    latencyMs: number;
  }> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(content, model);
    
    this.metrics.total_requests++;

    try {
      // Try to get from cache
      const cached = await this.getFromCache(cacheKey);
      
      if (cached) {
        const latency = Date.now() - startTime;
        this.updateMetrics(true, latency);
        
        // Update hit count asynchronously
        this.incrementHitCount(cacheKey, cached);
        
        return {
          embedding: cached.embedding,
          fromCache: true,
          latencyMs: latency
        };
      }

      // Cache miss - generate new embedding
      console.log(`Cache miss for content hash: ${cacheKey.split(':')[2]}`);
      const embedding = await generateFn();
      
      // Store in cache asynchronously
      this.storeInCache(cacheKey, embedding, model);
      
      const latency = Date.now() - startTime;
      this.updateMetrics(false, latency);
      
      return {
        embedding,
        fromCache: false,
        latencyMs: latency
      };

    } catch (error) {
      console.error('Embedding cache error:', error);
      // Fallback to generating new embedding
      const embedding = await generateFn();
      const latency = Date.now() - startTime;
      
      return {
        embedding,
        fromCache: false,
        latencyMs: latency
      };
    }
  }

  /**
   * Get embedding from cache
   */
  private async getFromCache(key: string): Promise<CachedEmbedding | null> {
    const result = await safeRedisOperation(
      async () => {
        const data = await redis?.get(key);
        if (!data) return null;
        
        try {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          return parsed as CachedEmbedding;
        } catch {
          return null;
        }
      },
      null
    );

    return result;
  }

  /**
   * Store embedding in cache
   */
  private async storeInCache(
    key: string,
    embedding: number[],
    model: string
  ): Promise<void> {
    const cachedData: CachedEmbedding = {
      embedding,
      model,
      timestamp: Date.now(),
      hit_count: 0
    };

    await safeRedisOperation(
      async () => {
        await redis?.setex(
          key,
          this.ttlSeconds,
          JSON.stringify(cachedData)
        );
        console.log(`Cached embedding for model ${model}, key: ${key.split(':')[2]}`);
      },
      undefined
    );

    // Manage cache size
    this.manageCacheSize();
  }

  /**
   * Increment hit count for cached embedding
   */
  private async incrementHitCount(
    key: string,
    cached: CachedEmbedding
  ): Promise<void> {
    cached.hit_count++;
    
    await safeRedisOperation(
      async () => {
        await redis?.setex(key, this.ttlSeconds, JSON.stringify(cached));
      },
      undefined
    );
  }

  /**
   * Update cache metrics
   */
  private updateMetrics(isHit: boolean, latencyMs: number): void {
    if (isHit) {
      this.metrics.cache_hits++;
    } else {
      this.metrics.cache_misses++;
    }

    // Update hit rate
    this.metrics.hit_rate = this.metrics.total_requests > 0
      ? this.metrics.cache_hits / this.metrics.total_requests
      : 0;

    // Update average latency (keep last 100 measurements)
    this.latencies.push(latencyMs);
    if (this.latencies.length > 100) {
      this.latencies.shift();
    }
    this.metrics.avg_latency_ms = 
      this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;

    // Log metrics periodically
    if (this.metrics.total_requests % 100 === 0) {
      console.log('Embedding Cache Metrics:', {
        ...this.metrics,
        hit_rate_percent: `${(this.metrics.hit_rate * 100).toFixed(1)}%`,
        avg_latency_ms: `${this.metrics.avg_latency_ms.toFixed(1)}ms`
      });
    }
  }

  /**
   * Manage cache size to prevent unbounded growth
   */
  private async manageCacheSize(): Promise<void> {
    // Check cache size every 100 requests
    if (this.metrics.total_requests % 100 !== 0) return;

    await safeRedisOperation(
      async () => {
        const keys = await redis?.keys(`${this.cachePrefix}*`);
        if (!keys || keys.length <= this.maxCacheSize) return;

        console.log(`Cache size (${keys.length}) exceeds limit (${this.maxCacheSize}), cleaning up...`);

        // Get all cached items with their metadata
        const items: Array<{ key: string; data: CachedEmbedding }> = [];
        
        for (const key of keys) {
          const data = await redis?.get(key);
          if (data) {
            try {
              const parsed = typeof data === 'string' ? JSON.parse(data) : data;
              items.push({ key, data: parsed });
            } catch {
              // Invalid entry, delete it
              await redis?.del(key);
            }
          }
        }

        // Sort by hit count and timestamp (LFU + LRU hybrid)
        items.sort((a, b) => {
          // Prioritize frequently used items
          if (a.data.hit_count !== b.data.hit_count) {
            return b.data.hit_count - a.data.hit_count;
          }
          // Then by recency
          return b.data.timestamp - a.data.timestamp;
        });

        // Delete least valuable items
        const toDelete = items.slice(this.maxCacheSize * 0.8); // Keep 80% of max size
        for (const item of toDelete) {
          await redis?.del(item.key);
        }

        console.log(`Cleaned up ${toDelete.length} cached embeddings`);
      },
      undefined,
      'manage cache size'
    );
  }

  /**
   * Warm up cache with frequently used content
   */
  async warmCache(
    contents: Array<{ content: string; model: string }>,
    generateFn: (content: string, model: string) => Promise<number[]>
  ): Promise<void> {
    console.log(`Warming cache with ${contents.length} embeddings...`);
    
    let warmed = 0;
    for (const { content, model } of contents) {
      const key = this.generateCacheKey(content, model);
      const cached = await this.getFromCache(key);
      
      if (!cached) {
        try {
          const embedding = await generateFn(content, model);
          await this.storeInCache(key, embedding, model);
          warmed++;
        } catch (error) {
          console.error(`Failed to warm cache for content:`, error);
        }
      }
    }
    
    console.log(`Cache warmed with ${warmed} new embeddings`);
  }

  /**
   * Get current cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear all cached embeddings
   */
  async clearCache(): Promise<void> {
    await safeRedisOperation(
      async () => {
        const keys = await redis?.keys(`${this.cachePrefix}*`);
        if (keys && keys.length > 0) {
          await redis?.del(...keys);
          console.log(`Cleared ${keys.length} cached embeddings`);
        }
      },
      undefined
    );

    // Reset metrics
    this.metrics = {
      total_requests: 0,
      cache_hits: 0,
      cache_misses: 0,
      hit_rate: 0,
      avg_latency_ms: 0,
      storage_size_mb: 0
    };
    this.latencies = [];
  }

  /**
   * Batch get embeddings with efficient caching
   */
  async getBatchEmbeddings(
    items: Array<{ content: string; model: string }>,
    generateBatchFn: (uncached: Array<{ content: string; model: string }>) => Promise<Map<string, number[]>>
  ): Promise<Map<string, number[]>> {
    const results = new Map<string, number[]>();
    const uncached: Array<{ content: string; model: string; key: string }> = [];

    // Check cache for all items
    for (const { content, model } of items) {
      const key = this.generateCacheKey(content, model);
      const cached = await this.getFromCache(key);
      
      if (cached) {
        results.set(content, cached.embedding);
        this.metrics.cache_hits++;
      } else {
        uncached.push({ content, model, key });
        this.metrics.cache_misses++;
      }
    }

    this.metrics.total_requests += items.length;

    // Generate embeddings for uncached items
    if (uncached.length > 0) {
      console.log(`Generating ${uncached.length} embeddings (${items.length - uncached.length} from cache)`);
      
      const uncachedContents = uncached.map(u => ({ content: u.content, model: u.model }));
      const newEmbeddings = await generateBatchFn(uncachedContents);
      
      // Store new embeddings in cache and results
      for (const { content, model, key } of uncached) {
        const embedding = newEmbeddings.get(content);
        if (embedding) {
          results.set(content, embedding);
          await this.storeInCache(key, embedding, model);
        }
      }
    }

    // Update metrics
    this.metrics.hit_rate = this.metrics.total_requests > 0
      ? this.metrics.cache_hits / this.metrics.total_requests
      : 0;

    return results;
  }
}

// Singleton instance
export const embeddingCache = new EmbeddingCache();
