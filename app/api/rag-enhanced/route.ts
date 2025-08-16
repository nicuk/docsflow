import { NextRequest, NextResponse } from 'next/server';
import { TemporalRAGEnhancement } from '@/lib/rag-temporal-enhancement';
import { AgenticRAGEnhancement } from '@/lib/agentic-rag-enhancement';
import { headers } from 'next/headers';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tenant-id, x-tenant-subdomain',
  'Access-Control-Allow-Credentials': 'true',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { query, options = {} } = await request.json();
    
    // Initialize enhanced RAG systems
    const temporalRAG = new TemporalRAGEnhancement();
    const agenticRAG = new AgenticRAGEnhancement();
    
    // Analyze query complexity
    const queryAnalysis = await agenticRAG.analyzeQuery(query, tenantId);
    
    // Determine if temporal context is needed
    const needsTemporalContext = 
      query.toLowerCase().includes('latest') ||
      query.toLowerCase().includes('recent') ||
      query.toLowerCase().includes('contract') ||
      query.toLowerCase().includes('when') ||
      query.toLowerCase().includes('dated') ||
      queryAnalysis.queryPlan.strategy === 'temporal';
    
    let response;
    
    if (needsTemporalContext) {
      // Use temporal-enhanced RAG for complex temporal queries
      response = await temporalRAG.queryWithTemporalContext(
        query,
        tenantId,
        {
          temporalScope: options.temporalScope || 'latest',
          entityResolution: true,
          relationshipMapping: true,
          conflictResolution: options.conflictResolution || 'latest_document_date'
        }
      );
    } else {
      // Use standard agentic RAG
      const searchResults = await agenticRAG.performEnhancedSearch(
        query,
        tenantId,
        queryAnalysis
      );
      
      response = await agenticRAG.generateResponse(
        searchResults,
        queryAnalysis,
        tenantId
      );
    }
    
    // Add performance metrics
    const performanceScore = calculatePerformanceScore(response);
    
    return NextResponse.json(
      {
        success: true,
        response: response.response || response,
        metadata: {
          ...response.metadata,
          performanceScore,
          queryComplexity: queryAnalysis.queryPlan.strategy,
          temporalContextUsed: needsTemporalContext
        }
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Enhanced RAG error:', error);
    return NextResponse.json(
      { 
        error: 'RAG processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

function calculatePerformanceScore(response: any): number {
  let score = 5.5; // Base score
  
  // Add points for various capabilities
  if (response.entityRelationships?.length > 0) score += 1; // Entity resolution
  if (response.metadata?.uniqueEntities > 1) score += 0.5; // Multiple entities handled
  if (response.metadata?.conflictResolution) score += 1; // Temporal conflict resolution
  if (response.results?.some((r: any) => r.temporalContext)) score += 1; // Temporal context
  if (response.results?.some((r: any) => r.relatedDocuments?.length > 0)) score += 0.5; // Document relationships
  
  return Math.min(score, 10);
}
