/**
 * RAG System Monitoring and Metrics
 * Tracks performance, errors, and usage patterns for the enhanced RAG system
 */

interface MetricEvent {
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: Date;
}

interface RAGMetrics {
  parseLatency: number[];
  searchLatency: number[];
  parseErrors: number;
  fallbackTriggers: number;
  tenantViolations: number;
  documentsProcessed: number;
  queriesProcessed: number;
}

class RAGMonitor {
  private metrics: Map<string, RAGMetrics> = new Map();
  private events: MetricEvent[] = [];
  
  /**
   * Track document parsing operation
   */
  trackParse(
    tenantId: string, 
    duration: number, 
    success: boolean, 
    parseMethod: 'advanced' | 'basic',
    documentType: string
  ): void {
    const tenantMetrics = this.getOrCreateMetrics(tenantId);
    
    tenantMetrics.parseLatency.push(duration);
    tenantMetrics.documentsProcessed++;
    
    if (!success) {
      tenantMetrics.parseErrors++;
    }
    
    if (parseMethod === 'basic') {
      tenantMetrics.fallbackTriggers++;
    }
    
    this.recordEvent({
      name: 'rag.parse',
      value: duration,
      tags: {
        tenant: tenantId,
        success: String(success),
        method: parseMethod,
        type: documentType
      },
      timestamp: new Date()
    });
    
    // Log warning if parse time exceeds threshold
    if (duration > 5000) {
      console.warn(`[RAG Monitor] Slow parse detected for tenant ${tenantId}: ${duration}ms`);
    }
    
    // Alert on high error rate
    this.checkErrorRate(tenantId);
  }
  
  /**
   * Track search operation
   */
  trackSearch(
    tenantId: string,
    duration: number,
    resultCount: number,
    searchType: 'vector' | 'hybrid' | 'knowledge-graph'
  ): void {
    const tenantMetrics = this.getOrCreateMetrics(tenantId);
    
    tenantMetrics.searchLatency.push(duration);
    tenantMetrics.queriesProcessed++;
    
    this.recordEvent({
      name: 'rag.search',
      value: duration,
      tags: {
        tenant: tenantId,
        results: String(resultCount),
        type: searchType
      },
      timestamp: new Date()
    });
    
    // Log warning if search time exceeds threshold
    if (duration > 1000) {
      console.warn(`[RAG Monitor] Slow search detected for tenant ${tenantId}: ${duration}ms`);
    }
  }
  
  /**
   * Track tenant isolation violations (CRITICAL)
   */
  trackTenantViolation(
    requestTenant: string,
    accessedTenant: string,
    context: string
  ): void {
    console.error(`[CRITICAL] Tenant isolation violation detected!`, {
      requestTenant,
      accessedTenant,
      context
    });
    
    const metrics = this.getOrCreateMetrics(requestTenant);
    metrics.tenantViolations++;
    
    this.recordEvent({
      name: 'rag.security.violation',
      value: 1,
      tags: {
        request_tenant: requestTenant,
        accessed_tenant: accessedTenant,
        context
      },
      timestamp: new Date()
    });
    
    // Immediate alert
    this.sendAlert('CRITICAL', `Tenant isolation violation: ${requestTenant} -> ${accessedTenant}`);
  }
  
  /**
   * Get metrics summary for a tenant
   */
  getMetricsSummary(tenantId?: string): any {
    if (tenantId) {
      const metrics = this.metrics.get(tenantId);
      if (!metrics) return null;
      
      return {
        tenant: tenantId,
        documentsProcessed: metrics.documentsProcessed,
        queriesProcessed: metrics.queriesProcessed,
        avgParseLatency: this.average(metrics.parseLatency),
        p95ParseLatency: this.percentile(metrics.parseLatency, 95),
        avgSearchLatency: this.average(metrics.searchLatency),
        p95SearchLatency: this.percentile(metrics.searchLatency, 95),
        parseErrorRate: metrics.documentsProcessed > 0 
          ? (metrics.parseErrors / metrics.documentsProcessed) * 100 
          : 0,
        fallbackRate: metrics.documentsProcessed > 0
          ? (metrics.fallbackTriggers / metrics.documentsProcessed) * 100
          : 0,
        tenantViolations: metrics.tenantViolations
      };
    }
    
    // Global summary
    const allMetrics = Array.from(this.metrics.values());
    const totalDocs = allMetrics.reduce((sum, m) => sum + m.documentsProcessed, 0);
    const totalQueries = allMetrics.reduce((sum, m) => sum + m.queriesProcessed, 0);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.parseErrors, 0);
    const totalFallbacks = allMetrics.reduce((sum, m) => sum + m.fallbackTriggers, 0);
    const totalViolations = allMetrics.reduce((sum, m) => sum + m.tenantViolations, 0);
    
    return {
      global: true,
      totalTenants: this.metrics.size,
      totalDocuments: totalDocs,
      totalQueries: totalQueries,
      globalErrorRate: totalDocs > 0 ? (totalErrors / totalDocs) * 100 : 0,
      globalFallbackRate: totalDocs > 0 ? (totalFallbacks / totalDocs) * 100 : 0,
      totalViolations,
      recentEvents: this.events.slice(-100)
    };
  }
  
  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(format: 'prometheus' | 'json' = 'json'): string {
    const summary = this.getMetricsSummary();
    
    if (format === 'prometheus') {
      return this.toPrometheusFormat(summary);
    }
    
    return JSON.stringify(summary, null, 2);
  }
  
  private getOrCreateMetrics(tenantId: string): RAGMetrics {
    if (!this.metrics.has(tenantId)) {
      this.metrics.set(tenantId, {
        parseLatency: [],
        searchLatency: [],
        parseErrors: 0,
        fallbackTriggers: 0,
        tenantViolations: 0,
        documentsProcessed: 0,
        queriesProcessed: 0
      });
    }
    return this.metrics.get(tenantId)!;
  }
  
  private recordEvent(event: MetricEvent): void {
    this.events.push(event);
    
    // Keep only last 10000 events
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }
  }
  
  private checkErrorRate(tenantId: string): void {
    const metrics = this.metrics.get(tenantId);
    if (!metrics || metrics.documentsProcessed < 10) return;
    
    const errorRate = (metrics.parseErrors / metrics.documentsProcessed) * 100;
    if (errorRate > 10) {
      console.error(`[RAG Monitor] High error rate for tenant ${tenantId}: ${errorRate.toFixed(2)}%`);
      this.sendAlert('WARNING', `High parse error rate for tenant ${tenantId}: ${errorRate.toFixed(2)}%`);
    }
    
    const fallbackRate = (metrics.fallbackTriggers / metrics.documentsProcessed) * 100;
    if (fallbackRate > 20) {
      console.warn(`[RAG Monitor] High fallback rate for tenant ${tenantId}: ${fallbackRate.toFixed(2)}%`);
    }
  }
  
  private sendAlert(level: 'CRITICAL' | 'WARNING' | 'INFO', message: string): void {
    // In production, this would send to PagerDuty, Slack, etc.
    console.log(`[ALERT ${level}] ${message}`);
    
    // Log to database for audit
    if (level === 'CRITICAL') {
      // TODO: Implement database logging
    }
  }
  
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
  
  private toPrometheusFormat(summary: any): string {
    const lines: string[] = [];
    
    lines.push(`# HELP rag_documents_total Total documents processed`);
    lines.push(`# TYPE rag_documents_total counter`);
    lines.push(`rag_documents_total ${summary.totalDocuments}`);
    
    lines.push(`# HELP rag_queries_total Total queries processed`);
    lines.push(`# TYPE rag_queries_total counter`);
    lines.push(`rag_queries_total ${summary.totalQueries}`);
    
    lines.push(`# HELP rag_error_rate Global error rate percentage`);
    lines.push(`# TYPE rag_error_rate gauge`);
    lines.push(`rag_error_rate ${summary.globalErrorRate}`);
    
    lines.push(`# HELP rag_fallback_rate Global fallback rate percentage`);
    lines.push(`# TYPE rag_fallback_rate gauge`);
    lines.push(`rag_fallback_rate ${summary.globalFallbackRate}`);
    
    lines.push(`# HELP rag_tenant_violations Total tenant isolation violations`);
    lines.push(`# TYPE rag_tenant_violations counter`);
    lines.push(`rag_tenant_violations ${summary.totalViolations}`);
    
    return lines.join('\n');
  }
}

// Singleton instance
export const ragMonitor = new RAGMonitor();

// Convenience functions
export function trackParseOperation(
  tenantId: string,
  duration: number,
  success: boolean,
  parseMethod: 'advanced' | 'basic' = 'advanced',
  documentType: string = 'unknown'
): void {
  ragMonitor.trackParse(tenantId, duration, success, parseMethod, documentType);
}

export function trackSearchOperation(
  tenantId: string,
  duration: number,
  resultCount: number,
  searchType: 'vector' | 'hybrid' | 'knowledge-graph' = 'vector'
): void {
  ragMonitor.trackSearch(tenantId, duration, resultCount, searchType);
}

export function trackTenantViolation(
  requestTenant: string,
  accessedTenant: string,
  context: string
): void {
  ragMonitor.trackTenantViolation(requestTenant, accessedTenant, context);
}

export function getRAGMetrics(tenantId?: string): any {
  return ragMonitor.getMetricsSummary(tenantId);
}

export function exportRAGMetrics(format: 'prometheus' | 'json' = 'json'): string {
  return ragMonitor.exportMetrics(format);
}
