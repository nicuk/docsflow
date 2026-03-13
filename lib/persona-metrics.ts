/**
 * Persona Metrics Tracking
 * Measures effectiveness and quality of AI persona responses
 */

import { createClient } from '@supabase/supabase-js';

interface PersonaMetrics {
  tenant_id: string;
  persona_role?: string;
  query: string;
  response: string;
  response_length: number;
  sources_count: number;
  confidence_score: number;
  response_time_ms: number;
  used_custom_persona: boolean;
  used_fallback: boolean;
  gibberish_detected: boolean;
  metadata?: Record<string, any>;
}

interface QualityScore {
  overall: number;
  hasSourceAttribution: boolean;
  appropriateLength: boolean;
  answeredQuestion: boolean;
  usedPersonaTone: boolean;
  providedConfidence: boolean;
}

/**
 * Log persona usage and response quality to database
 */
export async function logPersonaMetrics(metrics: PersonaMetrics): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Calculate quality score
    const qualityScore = calculateQualityScore(metrics);

    // Log to search_history table (already exists in schema)
    await supabase
      .from('search_history')
      .insert({
        tenant_id: metrics.tenant_id,
        query: metrics.query,
        response: metrics.response,
        document_ids: [], // Will be populated if sources available
        confidence_score: metrics.confidence_score,
        response_time_ms: metrics.response_time_ms,
        created_at: new Date().toISOString()
      });

    // Log detailed persona metrics to analytics_events
    await supabase
      .from('analytics_events')
      .insert({
        tenant_id: metrics.tenant_id,
        event_type: 'persona_usage',
        event_data: {
          persona_role: metrics.persona_role,
          response_quality: qualityScore,
          used_custom_persona: metrics.used_custom_persona,
          used_fallback: metrics.used_fallback,
          gibberish_detected: metrics.gibberish_detected,
          sources_count: metrics.sources_count,
          response_length: metrics.response_length,
          confidence_score: metrics.confidence_score,
          response_time_ms: metrics.response_time_ms,
          ...metrics.metadata
        },
        created_at: new Date().toISOString()
      });

  } catch {
    // Metrics failure shouldn't break the main flow
  }
}

/**
 * Calculate response quality score (0-1)
 */
function calculateQualityScore(metrics: PersonaMetrics): QualityScore {
  const response = metrics.response.toLowerCase();
  
  const hasSourceAttribution = 
    response.includes('document') || 
    response.includes('source') ||
    response.includes('according to') ||
    metrics.sources_count > 0;

  const appropriateLength = 
    metrics.response_length >= 50 && 
    metrics.response_length <= 2000;

  const answeredQuestion = 
    !response.includes("i don't have") || 
    (response.includes("i don't have") && response.includes('could you'));

  const usedPersonaTone = 
    metrics.used_custom_persona && 
    metrics.response_length > 0;

  const providedConfidence = 
    metrics.confidence_score >= 0.3;

  // Calculate overall score (weighted average)
  const weights = {
    hasSourceAttribution: 0.3,
    appropriateLength: 0.15,
    answeredQuestion: 0.25,
    usedPersonaTone: 0.15,
    providedConfidence: 0.15
  };

  const overall = 
    (hasSourceAttribution ? weights.hasSourceAttribution : 0) +
    (appropriateLength ? weights.appropriateLength : 0) +
    (answeredQuestion ? weights.answeredQuestion : 0) +
    (usedPersonaTone ? weights.usedPersonaTone : 0) +
    (providedConfidence ? weights.providedConfidence : 0);

  return {
    overall,
    hasSourceAttribution,
    appropriateLength,
    answeredQuestion,
    usedPersonaTone,
    providedConfidence
  };
}

/**
 * Get persona effectiveness analytics for a tenant
 */
export async function getPersonaAnalytics(tenantId: string, days: number = 30) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get all persona usage events
  const { data: events, error } = await supabase
    .from('analytics_events')
    .select('event_data, created_at')
    .eq('tenant_id', tenantId)
    .eq('event_type', 'persona_usage')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });

  if (error || !events) {
    return null;
  }

  // Calculate aggregate metrics
  const totalResponses = events.length;
  const customPersonaUsage = events.filter(e => e.event_data?.used_custom_persona).length;
  const fallbackUsage = events.filter(e => e.event_data?.used_fallback).length;
  const gibberishQueries = events.filter(e => e.event_data?.gibberish_detected).length;

  const avgQuality = events.reduce((sum, e) => 
    sum + (e.event_data?.response_quality?.overall || 0), 0
  ) / totalResponses;

  const avgResponseTime = events.reduce((sum, e) => 
    sum + (e.event_data?.response_time_ms || 0), 0
  ) / totalResponses;

  const avgConfidence = events.reduce((sum, e) => 
    sum + (e.event_data?.confidence_score || 0), 0
  ) / totalResponses;

  const avgSourcesCount = events.reduce((sum, e) => 
    sum + (e.event_data?.sources_count || 0), 0
  ) / totalResponses;

  return {
    period: {
      start: startDate.toISOString(),
      end: new Date().toISOString(),
      days
    },
    totals: {
      responses: totalResponses,
      customPersonaUsage,
      fallbackUsage,
      gibberishQueries
    },
    percentages: {
      customPersona: (customPersonaUsage / totalResponses) * 100,
      fallback: (fallbackUsage / totalResponses) * 100,
      gibberish: (gibberishQueries / totalResponses) * 100
    },
    quality: {
      average: avgQuality,
      distribution: calculateQualityDistribution(events)
    },
    performance: {
      avgResponseTimeMs: Math.round(avgResponseTime),
      avgConfidence: avgConfidence.toFixed(2),
      avgSourcesCount: avgSourcesCount.toFixed(1)
    }
  };
}

function calculateQualityDistribution(events: any[]) {
  const excellent = events.filter(e => e.event_data?.response_quality?.overall >= 0.8).length;
  const good = events.filter(e => 
    e.event_data?.response_quality?.overall >= 0.6 && 
    e.event_data?.response_quality?.overall < 0.8
  ).length;
  const fair = events.filter(e => 
    e.event_data?.response_quality?.overall >= 0.4 && 
    e.event_data?.response_quality?.overall < 0.6
  ).length;
  const poor = events.filter(e => e.event_data?.response_quality?.overall < 0.4).length;

  return {
    excellent,
    good,
    fair,
    poor,
    percentages: {
      excellent: (excellent / events.length) * 100,
      good: (good / events.length) * 100,
      fair: (fair / events.length) * 100,
      poor: (poor / events.length) * 100
    }
  };
}

/**
 * Compare persona performance: custom vs default
 */
export async function comparePersonaPerformance(tenantId: string, days: number = 30) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: events, error } = await supabase
    .from('analytics_events')
    .select('event_data')
    .eq('tenant_id', tenantId)
    .eq('event_type', 'persona_usage')
    .gte('created_at', startDate.toISOString());

  if (error || !events) return null;

  const customPersonaEvents = events.filter(e => e.event_data?.used_custom_persona);
  const defaultPersonaEvents = events.filter(e => !e.event_data?.used_custom_persona);

  const customAvgQuality = customPersonaEvents.reduce((sum, e) => 
    sum + (e.event_data?.response_quality?.overall || 0), 0
  ) / (customPersonaEvents.length || 1);

  const defaultAvgQuality = defaultPersonaEvents.reduce((sum, e) => 
    sum + (e.event_data?.response_quality?.overall || 0), 0
  ) / (defaultPersonaEvents.length || 1);

  const improvement = ((customAvgQuality - defaultAvgQuality) / defaultAvgQuality) * 100;

  return {
    custom: {
      count: customPersonaEvents.length,
      avgQuality: customAvgQuality,
      avgResponseTime: customPersonaEvents.reduce((sum, e) => 
        sum + (e.event_data?.response_time_ms || 0), 0
      ) / (customPersonaEvents.length || 1)
    },
    default: {
      count: defaultPersonaEvents.length,
      avgQuality: defaultAvgQuality,
      avgResponseTime: defaultPersonaEvents.reduce((sum, e) => 
        sum + (e.event_data?.response_time_ms || 0), 0
      ) / (defaultPersonaEvents.length || 1)
    },
    comparison: {
      qualityImprovement: improvement,
      status: improvement > 10 ? 'significant_improvement' :
              improvement > 0 ? 'slight_improvement' :
              improvement < -10 ? 'degradation' : 'neutral'
    }
  };
}

