import { NextRequest, NextResponse } from 'next/server';
import { validateTenantContext } from '@/lib/api-tenant-validation';
import { getPersonaAnalytics, comparePersonaPerformance } from '@/lib/persona-metrics';
import { getCORSHeaders } from '@/lib/utils';

/**
 * 📊 ANALYTICS ENDPOINT: Persona Performance Metrics
 * Shows how well the AI persona is performing
 */

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);
  
  try {
    // Validate tenant context
    const tenantValidation = await validateTenantContext(request, {
      requireAuth: true
    });
    
    if (!tenantValidation.isValid) {
      return NextResponse.json(
        { error: tenantValidation.error },
        { status: tenantValidation.statusCode || 401, headers: corsHeaders }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const type = searchParams.get('type') || 'overview';
    
    if (type === 'comparison') {
      // Compare custom vs default persona performance
      const comparison = await comparePersonaPerformance(tenantValidation.tenantId, days);
      
      if (!comparison) {
        return NextResponse.json(
          { 
            message: 'No persona usage data available yet',
            tip: 'Start using the chat feature to see analytics'
          },
          { headers: corsHeaders }
        );
      }
      
      return NextResponse.json({
        type: 'comparison',
        period_days: days,
        data: comparison,
        insights: generateComparisonInsights(comparison)
      }, { headers: corsHeaders });
    }
    
    // Get overview analytics
    const analytics = await getPersonaAnalytics(tenantValidation.tenantId, days);
    
    if (!analytics) {
      return NextResponse.json(
        { 
          message: 'No persona usage data available yet',
          tip: 'Start using the chat feature to see analytics'
        },
        { headers: corsHeaders }
      );
    }
    
    return NextResponse.json({
      type: 'overview',
      period_days: days,
      data: analytics,
      insights: generateInsights(analytics)
    }, { headers: corsHeaders });
    
  } catch (error) {
    console.error('Persona analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500, headers: corsHeaders }
    );
  }
}

function generateInsights(analytics: any): string[] {
  const insights: string[] = [];
  
  // Quality insights
  if (analytics.quality.average >= 0.8) {
    insights.push('✅ Excellent response quality! Your persona is performing very well.');
  } else if (analytics.quality.average >= 0.6) {
    insights.push('👍 Good response quality. Consider refining persona settings for better results.');
  } else if (analytics.quality.average >= 0.4) {
    insights.push('⚠️ Response quality could be improved. Review your persona configuration.');
  } else {
    insights.push('❌ Low response quality detected. Consider customizing your AI persona in settings.');
  }
  
  // Custom persona usage
  if (analytics.percentages.customPersona < 50) {
    insights.push('💡 Tip: Customize your AI persona to get better, more relevant responses.');
  }
  
  // Gibberish detection
  if (analytics.percentages.gibberish > 10) {
    insights.push(`ℹ️ ${analytics.percentages.gibberish.toFixed(1)}% of queries were unclear. The system provided helpful guidance.`);
  }
  
  // Performance
  if (analytics.performance.avgResponseTimeMs < 2000) {
    insights.push('⚡ Fast response times! Your queries are being processed efficiently.');
  } else if (analytics.performance.avgResponseTimeMs > 5000) {
    insights.push('🐌 Response times are slower than optimal. This may be due to complex queries or system load.');
  }
  
  // Confidence
  const avgConf = parseFloat(analytics.performance.avgConfidence);
  if (avgConf >= 0.7) {
    insights.push('🎯 High confidence in responses indicates good document relevance.');
  } else if (avgConf < 0.4) {
    insights.push('⚠️ Low confidence scores suggest documents may not contain relevant information for your queries.');
  }
  
  // Sources
  const avgSources = parseFloat(analytics.performance.avgSourcesCount);
  if (avgSources < 1) {
    insights.push('📄 Upload more relevant documents to improve response quality.');
  }
  
  return insights;
}

function generateComparisonInsights(comparison: any): string[] {
  const insights: string[] = [];
  const improvement = comparison.comparison.qualityImprovement;
  
  if (comparison.comparison.status === 'significant_improvement') {
    insights.push(`🎉 Your custom persona is ${improvement.toFixed(1)}% better than the default! Great customization.`);
  } else if (comparison.comparison.status === 'slight_improvement') {
    insights.push(`✅ Your custom persona shows ${improvement.toFixed(1)}% improvement over default.`);
  } else if (comparison.comparison.status === 'neutral') {
    insights.push('➡️ Custom and default personas are performing similarly. Consider refining your customization.');
  } else if (comparison.comparison.status === 'degradation') {
    insights.push(`⚠️ Default persona is performing ${Math.abs(improvement).toFixed(1)}% better. Review your custom settings.`);
  }
  
  // Usage patterns
  if (comparison.custom.count > 0 && comparison.default.count > 0) {
    const customPercentage = (comparison.custom.count / (comparison.custom.count + comparison.default.count)) * 100;
    insights.push(`📊 ${customPercentage.toFixed(1)}% of responses use your custom persona.`);
  }
  
  return insights;
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new Response(null, {
    status: 200,
    headers: getCORSHeaders(origin),
  });
}

