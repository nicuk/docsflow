/**
 * 🚨 MODEL COST MONITOR
 * 
 * Purpose: Track model usage and costs with real-time alerts
 * Guardrails: Alert when premium model usage exceeds thresholds
 */

export interface ModelUsage {
  model: string;
  calls: number;
  tokens: number;
  estimatedCost: number;
  tier: 'simple' | 'medium' | 'complex';
}

export interface CostAlert {
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  timestamp: Date;
}

export class ModelCostMonitor {
  private usage: Map<string, ModelUsage> = new Map();
  private alerts: CostAlert[] = [];

  // Cost thresholds per million tokens
  private readonly MODEL_COSTS = {
    'anthropic/claude-3.5-sonnet': 3.00,
    'meta-llama/llama-3.1-8b-instruct': 0.05,
    'mistralai/mistral-7b-instruct': 0.05,
    'qwen/qwen-2.5-7b-instruct': 0.05,
  };

  // Alert thresholds
  private readonly THRESHOLDS = {
    COMPLEX_PERCENTAGE: 0.12, // 12% max (10% target + 2% buffer)
    DAILY_COST_WARNING: 5.00,  // $5/day warning
    DAILY_COST_CRITICAL: 20.00, // $20/day critical
  };

  /**
   * Track a model usage
   */
  trackUsage(model: string, tokens: number, complexity: 'simple' | 'medium' | 'complex'): void {
    const existing = this.usage.get(model) || {
      model,
      calls: 0,
      tokens: 0,
      estimatedCost: 0,
      tier: complexity
    };

    const costPerToken = (this.MODEL_COSTS[model as keyof typeof this.MODEL_COSTS] || 0.05) / 1_000_000;
    const callCost = tokens * costPerToken;

    existing.calls++;
    existing.tokens += tokens;
    existing.estimatedCost += callCost;

    this.usage.set(model, existing);

    // Check for alerts
    this.checkAlerts();


  }

  /**
   * Check for cost alerts
   */
  private checkAlerts(): void {
    const stats = this.getStatistics();

    // Alert 1: Complex query percentage too high
    if (stats.complexity.complexPercentage > this.THRESHOLDS.COMPLEX_PERCENTAGE * 100) {
      this.addAlert({
        severity: 'warning',
        message: `Complex queries at ${stats.complexity.complexPercentage.toFixed(1)}% (threshold: ${this.THRESHOLDS.COMPLEX_PERCENTAGE * 100}%)`,
        metric: 'complex_percentage',
        currentValue: stats.complexity.complexPercentage,
        threshold: this.THRESHOLDS.COMPLEX_PERCENTAGE * 100,
        timestamp: new Date()
      });
    }

    // Alert 2: Daily cost warning
    if (stats.totalCost > this.THRESHOLDS.DAILY_COST_WARNING && 
        stats.totalCost < this.THRESHOLDS.DAILY_COST_CRITICAL) {
      this.addAlert({
        severity: 'warning',
        message: `Daily cost at $${stats.totalCost.toFixed(2)} (warning threshold: $${this.THRESHOLDS.DAILY_COST_WARNING})`,
        metric: 'daily_cost',
        currentValue: stats.totalCost,
        threshold: this.THRESHOLDS.DAILY_COST_WARNING,
        timestamp: new Date()
      });
    }

    // Alert 3: Daily cost critical
    if (stats.totalCost > this.THRESHOLDS.DAILY_COST_CRITICAL) {
      this.addAlert({
        severity: 'critical',
        message: `⚠️ CRITICAL: Daily cost at $${stats.totalCost.toFixed(2)} (critical threshold: $${this.THRESHOLDS.DAILY_COST_CRITICAL})`,
        metric: 'daily_cost',
        currentValue: stats.totalCost,
        threshold: this.THRESHOLDS.DAILY_COST_CRITICAL,
        timestamp: new Date()
      });
    }
  }

  /**
   * Add alert (deduplicate similar alerts)
   */
  private addAlert(alert: CostAlert): void {
    // Only keep recent alerts (last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    this.alerts = this.alerts.filter(a => a.timestamp.getTime() > fiveMinutesAgo);

    // Check if similar alert exists
    const similarExists = this.alerts.some(a => 
      a.metric === alert.metric && 
      a.severity === alert.severity
    );

    if (!similarExists) {
      this.alerts.push(alert);
    }
  }

  /**
   * Get usage statistics
   */
  getStatistics(): {
    totalCalls: number;
    totalTokens: number;
    totalCost: number;
    byModel: ModelUsage[];
    complexity: {
      simple: number;
      medium: number;
      complex: number;
      complexPercentage: number;
    };
    recentAlerts: CostAlert[];
  } {
    const usageArray = Array.from(this.usage.values());

    const totalCalls = usageArray.reduce((sum, u) => sum + u.calls, 0);
    const totalTokens = usageArray.reduce((sum, u) => sum + u.tokens, 0);
    const totalCost = usageArray.reduce((sum, u) => sum + u.estimatedCost, 0);

    const complexityCounts = {
      simple: usageArray.filter(u => u.tier === 'simple').reduce((sum, u) => sum + u.calls, 0),
      medium: usageArray.filter(u => u.tier === 'medium').reduce((sum, u) => sum + u.calls, 0),
      complex: usageArray.filter(u => u.tier === 'complex').reduce((sum, u) => sum + u.calls, 0)
    };

    const complexPercentage = totalCalls > 0 
      ? (complexityCounts.complex / totalCalls) * 100 
      : 0;

    return {
      totalCalls,
      totalTokens,
      totalCost,
      byModel: usageArray.sort((a, b) => b.estimatedCost - a.estimatedCost),
      complexity: {
        ...complexityCounts,
        complexPercentage
      },
      recentAlerts: this.alerts
    };
  }

  /**
   * Log current statistics
   */
  logStatistics(): void {
    // No-op: statistics available via getStatistics()
  }

  /**
   * Reset statistics (for testing or daily resets)
   */
  reset(): void {
    this.usage.clear();
    this.alerts = [];
  }
}

// Singleton instance
export const costMonitor = new ModelCostMonitor();

// Log statistics every 50 calls
let callCount = 0;
const originalTrackUsage = costMonitor.trackUsage.bind(costMonitor);
costMonitor.trackUsage = function(model: string, tokens: number, complexity: 'simple' | 'medium' | 'complex'): void {
  originalTrackUsage(model, tokens, complexity);
  callCount++;
  if (callCount % 50 === 0) {
    costMonitor.logStatistics();
  }
};

