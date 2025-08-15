import { redis, safeRedisOperation } from './redis';

interface QueryMetrics {
  query: string;
  enhanced_query?: string;
  tenant_id: string;
  timestamp: number;
  latency_ms: number;
  results_count: number;
  vector_results: number;
  keyword_results: number;
  reranked: boolean;
  cache_hits: number;
  cache_misses: number;
  relevance_scores: number[];
  avg_relevance: number;
  search_strategy: string;
  error?: string;
}

interface SystemMetrics {
  total_queries: number;
  avg_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  cache_hit_rate: number;
  rerank_usage_rate: number;
  avg_results_per_query: number;
  avg_relevance_score: number;
  error_rate: number;
  queries_per_minute: number;
}

interface TenantMetrics {
  tenant_id: string;
  query_count: number;
  avg_latency_ms: number;
  cache_hit_rate: number;
  total_tokens_used: number;
  total_api_calls: number;
  storage_mb: number;
  last_active: number;
}

export class RAGMetricsCollector {
  private readonly metricsPrefix = 'metrics:';
  private readonly queryMetricsKey = 'query_metrics';
  private readonly systemMetricsKey = 'system_metrics';
  private readonly tenantMetricsPrefix = 'tenant_metrics:';
  private recentLatencies: number[] = [];
  private recentRelevanceScores: number[] = [];

  /**
   * Record metrics for a query
   */
  async recordQueryMetrics(metrics: QueryMetrics): Promise<void> {
    const timestamp = Date.now();
    
    // Store individual query metrics
    await safeRedisOperation(
      async () => {
        const key = `${this.metricsPrefix}${this.queryMetricsKey}:${timestamp}`;
        await redis?.setex(
          key,
          86400, // Keep for 24 hours
          JSON.stringify(metrics)
        );
      },
      undefined
    );

    // Update aggregated metrics
    await this.updateAggregatedMetrics(metrics);
    
    // Update tenant-specific metrics
    await this.updateTenantMetrics(metrics);

    // Log significant events
    if (metrics.latency_ms > 1000) {
      console.warn(`Slow query detected: ${metrics.latency_ms}ms for "${metrics.query}"`);
    }
    
    if (metrics.avg_relevance < 0.5) {
      console.warn(`Low relevance query: ${metrics.avg_relevance} for "${metrics.query}"`);
    }
  }

  /**
   * Update system-wide aggregated metrics
   */
  private async updateAggregatedMetrics(metrics: QueryMetrics): Promise<void> {
    // Update recent latencies (keep last 1000)
    this.recentLatencies.push(metrics.latency_ms);
    if (this.recentLatencies.length > 1000) {
      this.recentLatencies.shift();
    }

    // Update recent relevance scores
    this.recentRelevanceScores.push(...metrics.relevance_scores);
    if (this.recentRelevanceScores.length > 1000) {
      this.recentRelevanceScores.splice(0, this.recentRelevanceScores.length - 1000);
    }

    // Calculate percentiles
    const sortedLatencies = [...this.recentLatencies].sort((a, b) => a - b);
    const p50 = this.getPercentile(sortedLatencies, 50);
    const p95 = this.getPercentile(sortedLatencies, 95);
    const p99 = this.getPercentile(sortedLatencies, 99);

    // Get current system metrics
    const currentMetrics = await this.getSystemMetrics();

    // Update metrics
    const updatedMetrics: SystemMetrics = {
      total_queries: (currentMetrics?.total_queries || 0) + 1,
      avg_latency_ms: this.average(this.recentLatencies),
      p50_latency_ms: p50,
      p95_latency_ms: p95,
      p99_latency_ms: p99,
      cache_hit_rate: this.calculateCacheHitRate(metrics, currentMetrics),
      rerank_usage_rate: this.calculateRerankRate(metrics, currentMetrics),
      avg_results_per_query: this.calculateAvgResults(metrics, currentMetrics),
      avg_relevance_score: this.average(this.recentRelevanceScores),
      error_rate: metrics.error ? this.calculateErrorRate(currentMetrics) : currentMetrics?.error_rate || 0,
      queries_per_minute: this.calculateQPM(currentMetrics)
    };

    // Store updated metrics
    await safeRedisOperation(
      async () => {
        await redis?.set(
          `${this.metricsPrefix}${this.systemMetricsKey}`,
          JSON.stringify(updatedMetrics)
        );
      },
      undefined,
      'update system metrics'
    );

    // Log metrics periodically
    if (updatedMetrics.total_queries % 100 === 0) {
      console.log('RAG System Metrics:', {
        queries: updatedMetrics.total_queries,
        avg_latency: `${updatedMetrics.avg_latency_ms.toFixed(1)}ms`,
        p95_latency: `${updatedMetrics.p95_latency_ms.toFixed(1)}ms`,
        cache_hit_rate: `${(updatedMetrics.cache_hit_rate * 100).toFixed(1)}%`,
        avg_relevance: updatedMetrics.avg_relevance_score.toFixed(3),
        qpm: updatedMetrics.queries_per_minute.toFixed(1)
      });
    }
  }

  /**
   * Update tenant-specific metrics
   */
  private async updateTenantMetrics(metrics: QueryMetrics): Promise<void> {
    const key = `${this.metricsPrefix}${this.tenantMetricsPrefix}${metrics.tenant_id}`;
    
    await safeRedisOperation(
      async () => {
        const existing = await redis?.get(key);
        const current: TenantMetrics = existing 
          ? JSON.parse(existing as string)
          : {
              tenant_id: metrics.tenant_id,
              query_count: 0,
              avg_latency_ms: 0,
              cache_hit_rate: 0,
              total_tokens_used: 0,
              total_api_calls: 0,
              storage_mb: 0,
              last_active: Date.now()
            };

        // Update metrics
        const totalLatency = current.avg_latency_ms * current.query_count + metrics.latency_ms;
        current.query_count++;
        current.avg_latency_ms = totalLatency / current.query_count;
        
        const totalCacheHits = current.cache_hit_rate * (current.query_count - 1) + 
                              (metrics.cache_hits / (metrics.cache_hits + metrics.cache_misses));
        current.cache_hit_rate = totalCacheHits / current.query_count;
        
        current.last_active = Date.now();

        await redis?.set(key, JSON.stringify(current));
      },
      {}
    );
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics | null> {
    const result = await safeRedisOperation(
      async () => {
        const data = await redis?.get(`${this.metricsPrefix}${this.systemMetricsKey}`);
        return data ? JSON.parse(data as string) : null;
      },
      {}
    );

    return result;
  }

  /**
   * Get tenant metrics
   */
  async getTenantMetrics(tenantId: string): Promise<TenantMetrics | null> {
    const result = await safeRedisOperation(
      async () => {
        const data = await redis?.get(`${this.metricsPrefix}${this.tenantMetricsPrefix}${tenantId}`);
        return data ? JSON.parse(data as string) : null;
      },
      {}
    );

    return result;
  }

  /**
   * Get recent query metrics
   */
  async getRecentQueries(limit: number = 10): Promise<QueryMetrics[]> {
    const result = await safeRedisOperation(
      async () => {
        const keys = await redis?.keys(`${this.metricsPrefix}${this.queryMetricsKey}:*`);
        if (!keys || keys.length === 0) return [];

        // Sort by timestamp (embedded in key)
        const sortedKeys = keys.sort().reverse().slice(0, limit);
        
        const queries: QueryMetrics[] = [];
        for (const key of sortedKeys) {
          const data = await redis?.get(key);
          if (data) {
            queries.push(JSON.parse(data as string));
          }
        }
        
        return queries;
      },
      [],
      'get recent queries'
    );

    return result || [];
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(): Promise<{
    system: SystemMetrics | null;
    topTenants: TenantMetrics[];
    slowQueries: QueryMetrics[];
    lowRelevanceQueries: QueryMetrics[];
    recommendations: string[];
  }> {
    const system = await this.getSystemMetrics();
    const recentQueries = await this.getRecentQueries(100);
    
    // Get top tenants by query count
    const tenantKeys = await safeRedisOperation(
      async () => await redis?.keys(`${this.metricsPrefix}${this.tenantMetricsPrefix}*`),
      [],
      'get tenant keys'
    );

    const tenants: TenantMetrics[] = [];
    for (const key of tenantKeys || []) {
      const data = await redis?.get(key);
      if (data) {
        tenants.push(JSON.parse(data as string));
      }
    }
    
    const topTenants = tenants
      .sort((a, b) => b.query_count - a.query_count)
      .slice(0, 5);

    // Find problematic queries
    const slowQueries = recentQueries
      .filter(q => q.latency_ms > 1000)
      .sort((a, b) => b.latency_ms - a.latency_ms)
      .slice(0, 5);

    const lowRelevanceQueries = recentQueries
      .filter(q => q.avg_relevance < 0.5)
      .sort((a, b) => a.avg_relevance - b.avg_relevance)
      .slice(0, 5);

    // Generate recommendations
    const recommendations = this.generateRecommendations(system, slowQueries, lowRelevanceQueries);

    return {
      system,
      topTenants,
      slowQueries,
      lowRelevanceQueries,
      recommendations
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    system: SystemMetrics | null,
    slowQueries: QueryMetrics[],
    lowRelevanceQueries: QueryMetrics[]
  ): string[] {
    const recommendations: string[] = [];

    if (!system) return ['No metrics data available yet'];

    // Latency recommendations
    if (system.p95_latency_ms > 1500) {
      recommendations.push('High P95 latency detected. Consider optimizing vector index or increasing cache size.');
    }

    // Cache recommendations
    if (system.cache_hit_rate < 0.3) {
      recommendations.push('Low cache hit rate. Consider implementing query normalization or increasing cache TTL.');
    }

    // Relevance recommendations
    if (system.avg_relevance_score < 0.6) {
      recommendations.push('Low average relevance scores. Consider improving document chunking or query enhancement.');
    }

    // Reranking recommendations
    if (system.rerank_usage_rate < 0.5 && system.avg_relevance_score < 0.7) {
      recommendations.push('Low reranking usage with suboptimal relevance. Enable semantic reranking for better results.');
    }

    // Query pattern recommendations
    if (slowQueries.length > 0) {
      const avgSlowLatency = this.average(slowQueries.map(q => q.latency_ms));
      recommendations.push(`${slowQueries.length} slow queries detected (avg ${avgSlowLatency.toFixed(0)}ms). Review query complexity.`);
    }

    // Document quality recommendations
    if (lowRelevanceQueries.length > 3) {
      recommendations.push('Multiple low-relevance queries detected. Consider improving document quality or chunking strategy.');
    }

    // Scale recommendations
    if (system.queries_per_minute > 100) {
      recommendations.push('High query volume detected. Consider horizontal scaling or read replicas.');
    }

    return recommendations.length > 0 ? recommendations : ['System performing within normal parameters'];
  }

  /**
   * Helper: Calculate percentile
   */
  private getPercentile(sorted: number[], percentile: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  /**
   * Helper: Calculate average
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  /**
   * Helper: Calculate cache hit rate
   */
  private calculateCacheHitRate(metrics: QueryMetrics, current: SystemMetrics | null): number {
    const totalHits = (current?.cache_hit_rate || 0) * (current?.total_queries || 0) + metrics.cache_hits;
    const totalAttempts = (current?.total_queries || 0) + metrics.cache_hits + metrics.cache_misses;
    return totalAttempts > 0 ? totalHits / totalAttempts : 0;
  }

  /**
   * Helper: Calculate rerank usage rate
   */
  private calculateRerankRate(metrics: QueryMetrics, current: SystemMetrics | null): number {
    const totalReranked = (current?.rerank_usage_rate || 0) * (current?.total_queries || 0) + (metrics.reranked ? 1 : 0);
    const totalQueries = (current?.total_queries || 0) + 1;
    return totalReranked / totalQueries;
  }

  /**
   * Helper: Calculate average results
   */
  private calculateAvgResults(metrics: QueryMetrics, current: SystemMetrics | null): number {
    const totalResults = (current?.avg_results_per_query || 0) * (current?.total_queries || 0) + metrics.results_count;
    const totalQueries = (current?.total_queries || 0) + 1;
    return totalResults / totalQueries;
  }

  /**
   * Helper: Calculate error rate
   */
  private calculateErrorRate(current: SystemMetrics | null): number {
    const totalErrors = (current?.error_rate || 0) * (current?.total_queries || 0) + 1;
    const totalQueries = (current?.total_queries || 0) + 1;
    return totalErrors / totalQueries;
  }

  /**
   * Helper: Calculate queries per minute
   */
  private calculateQPM(current: SystemMetrics | null): number {
    // Simple moving average over last few queries
    const totalQueries = (current?.total_queries || 0) + 1;
    const timeWindowMinutes = 5; // Consider last 5 minutes
    return Math.min(totalQueries, totalQueries / timeWindowMinutes);
  }

  /**
   * Clear all metrics
   */
  async clearMetrics(): Promise<void> {
    await safeRedisOperation(
      async () => {
        const keys = await redis?.keys(`${this.metricsPrefix}*`);
        if (keys && keys.length > 0) {
          await redis?.del(...keys);
          console.log(`Cleared ${keys.length} metric entries`);
        }
      },
      undefined
    );

    this.recentLatencies = [];
    this.recentRelevanceScores = [];
  }
}

// Singleton instance
export const ragMetrics = new RAGMetricsCollector();
