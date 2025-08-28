import { NextRequest, NextResponse } from 'next/server';
import { HybridRAGReranker } from '@/lib/rag-hybrid-reranker';
import { TemporalRAGEnhancement } from '@/lib/rag-temporal-enhancement';
import { AgenticRAGEnhancement } from '@/lib/agentic-rag-enhancement';
import { RAGEvaluator } from '@/lib/rag-evaluation';
import { RAGEdgeCaseHandler } from '@/lib/rag-edge-case-handler';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const edgeCaseHandler = new RAGEdgeCaseHandler();
  
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 401 }
      );
    }

    const { query, options = {} } = await request.json();
    
    // Handle edge cases
    const edgeCase = await edgeCaseHandler.handleEdgeCases(query);
    if (edgeCase.handled) {
      return NextResponse.json({
        success: false,
        error: edgeCase.errorType,
        message: edgeCase.fallbackResponse,
        suggestedAction: edgeCase.suggestedAction
      }, { status: 400 });
    }

    // Initialize all RAG components
    const hybridReranker = new HybridRAGReranker();
    const temporalEnhancer = new TemporalRAGEnhancement();
    const agenticEnhancer = new AgenticRAGEnhancement();
    
    // Analyze query complexity
    const queryAnalysis = await agenticEnhancer.analyzeQuery(query, tenantId);
    const isTemporalQuery = /latest|recent|last|ago|between|from.*to|changed|updated/i.test(query);
    // Extract complexity from the analysis prompt response
    const queryComplexity = queryAnalysis.queryPlan.strategy === 'multi_doc' || 
                          queryAnalysis.queryPlan.strategy === 'comparative' || 
                          queryAnalysis.queryPlan.strategy === 'hierarchical' ? 'complex' : 
                          queryAnalysis.queryPlan.strategy === 'temporal' ? 'moderate' : 'simple';
    const isComplexQuery = queryComplexity === 'complex' || queryAnalysis.decomposedQueries.length > 1;
    
    let response;
    let performanceScore = 5.5; // Base score
    const metadata: any = {
      queryComplexity: queryComplexity,
      searchStrategy: 'hybrid_crossencoder_temporal'
    };

    // Use enhanced pipeline with all improvements
    const enhancedResponse = await hybridReranker.enhancedRAGPipeline(
      query,
      tenantId,
      {
        topK: options.topK || 10,
        confidenceThreshold: options.confidenceThreshold || 0.7,
        includeProvenance: true
      }
    );

    // Handle abstention
    if (enhancedResponse.abstained) {
      return NextResponse.json({
        success: false,
        abstained: true,
        response: enhancedResponse.message,
        reason: enhancedResponse.reason,
        confidence: enhancedResponse.confidence,
        suggestedAction: enhancedResponse.suggestedAction,
        metadata: {
          ...metadata,
          performanceScore: 3.0, // Low score for abstention
          abstentionReason: enhancedResponse.reason
        }
      });
    }

    // Apply temporal enhancement if needed
    if (isTemporalQuery) {
      const temporalContext = await temporalEnhancer.queryWithTemporalContext(
        query,
        tenantId,
        {
          temporalScope: options.temporalScope || 'all',
          entityResolution: true,
          relationshipMapping: true,
          conflictResolution: options.conflictResolution || 'latest_document_date'
        }
      );
      
      // Merge temporal insights
      enhancedResponse.response = temporalContext.response || enhancedResponse.response;
      metadata.temporalContextUsed = true;
      metadata.uniqueEntities = temporalContext.uniqueEntities || 0;
      metadata.conflictResolution = temporalContext.conflictResolution;
      performanceScore += 1.5; // Bonus for temporal handling
    }

    // Apply agentic reasoning for complex queries
    if (isComplexQuery) {
      // Use synthesizeWithReasoning for complex query handling
      const searchResults = enhancedResponse.sources || [];
      const agenticResponse = await agenticEnhancer.synthesizeWithReasoning(
        queryAnalysis,
        searchResults,
        tenantId
      );
      
      if (agenticResponse) {
        enhancedResponse.response = agenticResponse.response;
        metadata.reasoningSteps = agenticResponse.reasoning;
        metadata.confidence = agenticResponse.confidence;
        performanceScore += 1.0; // Bonus for complex reasoning
      }
    }

    // Score improvements based on features used
    if (enhancedResponse.metadata) {
      // Hybrid search bonus
      if (enhancedResponse.metadata.searchStrategy === 'hybrid_crossencoder_rerank') {
        performanceScore += 1.0;
      }
      
      // Provenance tracking bonus
      if (enhancedResponse.sources && enhancedResponse.sources.length > 0) {
        performanceScore += 0.5;
        metadata.sourcesProvided = enhancedResponse.sources.length;
      }
      
      // High confidence bonus
      if (enhancedResponse.confidence > 0.8) {
        performanceScore += 0.5;
      }
    }

    // Cap score at 10
    performanceScore = Math.min(performanceScore, 10);

    // Run evaluation if in test mode
    if (options.runEvaluation) {
      const evaluator = new RAGEvaluator();
      const evalResult = await evaluator.evaluateQuery(
        {
          id: 'live-query',
          query,
          expectedAnswer: '',
          requiredFacts: [],
          category: isComplexQuery ? 'complex' : 'factual',
          difficulty: isComplexQuery ? 'hard' : 'easy'
        },
        {
          answer: enhancedResponse.response,
          contexts: enhancedResponse.sources?.map((s: any) => s.source) || [],
          relevanceScores: enhancedResponse.sources?.map((s: any) => s.confidence) || []
        }
      );
      
      metadata.evaluation = evalResult;
      performanceScore = evalResult.overallScore;
    }

    return NextResponse.json({
      success: true,
      response: enhancedResponse.response,
      sources: enhancedResponse.sources,
      confidence: enhancedResponse.confidence,
      metadata: {
        ...metadata,
        ...enhancedResponse.metadata,
        performanceScore,
        improvements: {
          hybridSearch: true,
          crossEncoderReranking: true,
          queryRewriting: true,
          strictProvenance: true,
          temporalPolicy: isTemporalQuery,
          entityNormalization: true,
          abstentionLogic: true
        }
      }
    });

  } catch (error) {
    console.error('Enhanced RAG error:', error);
    
    // Handle specific error cases
    const errorContext = {
      error,
      elapsedTime: Date.now() - startTime
    };
    
    const errorEdgeCase = await edgeCaseHandler.handleEdgeCases(null, errorContext);
    if (errorEdgeCase.handled) {
      return NextResponse.json({
        success: false,
        error: errorEdgeCase.errorType,
        message: errorEdgeCase.fallbackResponse,
        suggestedAction: errorEdgeCase.suggestedAction
      }, { status: 503 });
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-tenant-id, x-tenant-subdomain',
    },
  });
}
