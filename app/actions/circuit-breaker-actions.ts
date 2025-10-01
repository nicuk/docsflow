'use server'

import { auth } from '@clerk/nextjs/server'
import { CircuitBreakerFactory } from '@/lib/circuit-breaker'
import { degradationManager } from '@/lib/emergency-degradation'
import { supabase } from '@/lib/supabase'

/**
 * Server Actions for Circuit Breaker Management
 * 🔐 All actions verify admin access before execution
 * ✅ No API endpoints needed - runs server-side only
 */

interface CircuitBreakerMetrics {
  totalCalls: number;
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  state: 'closed' | 'open' | 'half_open';
}

interface DegradationStatus {
  currentLevel: number;
  triggeredServices: string[];
  activatedAt: number;
  reason: string;
  uptime: number;
  affectedOperations: string[];
}

interface SystemHealth {
  overallStatus: 'healthy' | 'degraded' | 'critical';
  activeIssues: string[];
  recommendations: string[];
}

export interface HealthData {
  timestamp: string;
  circuitBreakers: Record<string, CircuitBreakerMetrics>;
  degradation: DegradationStatus;
  systemHealth: SystemHealth;
}

/**
 * Verify if user is admin
 */
async function verifyAdminAccess(): Promise<{ isAdmin: boolean; userId: string | null }> {
  const { userId } = await auth()
  
  if (!userId) {
    return { isAdmin: false, userId: null }
  }

  // Check admin status from database
  try {
    const { data: userProfile } = await supabase!
      .from('users')
      .select('role, access_level')
      .eq('id', userId)
      .single()

    const isAdmin = userProfile?.role === 'admin' || userProfile?.access_level === 1
    return { isAdmin, userId }
  } catch (error) {
    console.error('Failed to verify admin access:', error)
    return { isAdmin: false, userId }
  }
}

/**
 * Get Circuit Breaker Health Data
 * Read-only action - no auth required (internal dashboard use)
 */
export async function getCircuitBreakerHealth(): Promise<HealthData> {
  try {
    const allMetrics = CircuitBreakerFactory.getAllMetrics()
    const degradationStatus = degradationManager.getStatus()

    return {
      timestamp: new Date().toISOString(),
      circuitBreakers: allMetrics,
      degradation: degradationStatus,
      systemHealth: {
        overallStatus: calculateOverallHealth(allMetrics, degradationStatus),
        activeIssues: getActiveIssues(allMetrics, degradationStatus),
        recommendations: getRecommendations(allMetrics, degradationStatus)
      }
    }
  } catch (error) {
    console.error('Failed to get circuit breaker health:', error)
    throw new Error('Failed to fetch health data')
  }
}

/**
 * Control Circuit Breaker (Open/Close/Reset)
 * 🔐 Requires admin access
 */
export async function controlCircuitBreaker(
  service: string,
  action: 'open' | 'close' | 'reset'
): Promise<{ success: boolean; error?: string; newState?: string }> {
  try {
    // Verify admin access
    const { isAdmin, userId } = await verifyAdminAccess()
    
    if (!isAdmin) {
      return {
        success: false,
        error: 'Admin access required to control circuit breakers'
      }
    }

    // Validate service name
    let breaker
    switch (service) {
      case 'google_ai':
        breaker = CircuitBreakerFactory.getGoogleAI()
        break
      case 'supabase':
        breaker = CircuitBreakerFactory.getSupabase()
        break
      case 'redis':
        breaker = CircuitBreakerFactory.getRedis()
        break
      default:
        return {
          success: false,
          error: `Invalid service name: ${service}`
        }
    }

    // Perform action
    switch (action) {
      case 'open':
        breaker.forceOpen()
        break
      case 'close':
      case 'reset':
        breaker.forceClose()
        break
      default:
        return {
          success: false,
          error: `Invalid action: ${action}. Use: open, close, or reset`
        }
    }

    // Log the action for audit trail
    console.log(`🔧 [CIRCUIT BREAKER] User ${userId} ${action}ed ${service} circuit breaker`)

    return {
      success: true,
      newState: breaker.getState()
    }

  } catch (error) {
    console.error('Circuit breaker control failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Helper functions
function calculateOverallHealth(metrics: any, degradationStatus: any): 'healthy' | 'degraded' | 'critical' {
  const openCircuits = Object.values(metrics).filter((m: any) => m.state === 'open').length
  const degradationLevel = degradationStatus.currentLevel

  if (openCircuits === 0 && degradationLevel === 0) {
    return 'healthy'
  } else if (openCircuits <= 1 && degradationLevel <= 1) {
    return 'degraded'
  } else {
    return 'critical'
  }
}

function getActiveIssues(metrics: any, degradationStatus: any): string[] {
  const issues: string[] = []

  for (const [service, metric] of Object.entries(metrics)) {
    const m = metric as any
    if (m.state === 'open') {
      issues.push(`${service} circuit breaker is OPEN`)
    } else if (m.state === 'half_open') {
      issues.push(`${service} circuit breaker is testing recovery`)
    }
  }

  if (degradationStatus.currentLevel > 0) {
    issues.push(`System degradation level: ${degradationStatus.currentLevel}`)
  }

  return issues
}

function getRecommendations(metrics: any, degradationStatus: any): string[] {
  const recommendations: string[] = []

  const openCircuits = Object.entries(metrics).filter(([_, m]: [string, any]) => m.state === 'open')
  
  if (openCircuits.length > 0) {
    recommendations.push('Check external service health and consider manual recovery')
  }

  if (degradationStatus.currentLevel > 0) {
    recommendations.push('Monitor service recovery and attempt system recovery when possible')
  }

  if (openCircuits.length === 0 && degradationStatus.currentLevel === 0) {
    recommendations.push('System is healthy - no action required')
  }

  return recommendations
}

