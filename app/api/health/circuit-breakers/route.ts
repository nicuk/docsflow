import { NextRequest, NextResponse } from 'next/server';
import { CircuitBreakerFactory } from '@/lib/circuit-breaker';
import { degradationManager } from '@/lib/emergency-degradation';

/**
 * Circuit Breaker Health Check Endpoint
 * Provides real-time monitoring of all circuit breakers and degradation status
 */
export async function GET(request: NextRequest) {
  try {
    const allMetrics = CircuitBreakerFactory.getAllMetrics();
    const degradationStatus = degradationManager.getStatus();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      circuitBreakers: allMetrics,
      degradation: degradationStatus,
      systemHealth: {
        overallStatus: calculateOverallHealth(allMetrics, degradationStatus),
        activeIssues: getActiveIssues(allMetrics, degradationStatus),
        recommendations: getRecommendations(allMetrics, degradationStatus)
      }
    });
  } catch (error) {
    console.error('Circuit breaker health check error:', error);
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
}

/**
 * Manual Circuit Breaker Control
 * Allows manual opening/closing of circuit breakers for maintenance
 */
export async function POST(request: NextRequest) {
  try {
    const { action, service } = await request.json();

    if (!action || !service) {
      return NextResponse.json(
        { error: 'action and service are required' },
        { status: 400 }
      );
    }

    let breaker;
    switch (service) {
      case 'google_ai':
        breaker = CircuitBreakerFactory.getGoogleAI();
        break;
      case 'supabase':
        breaker = CircuitBreakerFactory.getSupabase();
        break;
      case 'redis':
        breaker = CircuitBreakerFactory.getRedis();
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid service name' },
          { status: 400 }
        );
    }

    switch (action) {
      case 'open':
        breaker.forceOpen();
        break;
      case 'close':
        breaker.forceClose();
        break;
      case 'reset':
        breaker.forceClose();
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: open, close, or reset' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      service,
      action,
      newState: breaker.getState(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Circuit breaker control error:', error);
    return NextResponse.json(
      { error: 'Circuit breaker control failed' },
      { status: 500 }
    );
  }
}

function calculateOverallHealth(metrics: any, degradationStatus: any): string {
  const openCircuits = Object.values(metrics).filter((m: any) => m.state === 'open').length;
  const degradationLevel = degradationStatus.currentLevel;

  if (openCircuits === 0 && degradationLevel === 0) {
    return 'healthy';
  } else if (openCircuits <= 1 && degradationLevel <= 1) {
    return 'degraded';
  } else {
    return 'critical';
  }
}

function getActiveIssues(metrics: any, degradationStatus: any): string[] {
  const issues: string[] = [];

  for (const [service, metric] of Object.entries(metrics)) {
    const m = metric as any;
    if (m.state === 'open') {
      issues.push(`${service} circuit breaker is OPEN`);
    } else if (m.state === 'half_open') {
      issues.push(`${service} circuit breaker is testing recovery`);
    }
  }

  if (degradationStatus.currentLevel > 0) {
    issues.push(`System degradation level: ${degradationStatus.currentLevel}`);
  }

  return issues;
}

function getRecommendations(metrics: any, degradationStatus: any): string[] {
  const recommendations: string[] = [];

  const openCircuits = Object.entries(metrics).filter(([_, m]: [string, any]) => m.state === 'open');
  
  if (openCircuits.length > 0) {
    recommendations.push('Check external service health and consider manual recovery');
  }

  if (degradationStatus.currentLevel > 0) {
    recommendations.push('Monitor service recovery and attempt system recovery when possible');
  }

  if (openCircuits.length === 0 && degradationStatus.currentLevel === 0) {
    recommendations.push('System is healthy - no action required');
  }

  return recommendations;
}
