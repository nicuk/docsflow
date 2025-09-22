/**
 * Unified RAG Pipeline Factory
 * Consolidates 7 competing RAG implementations into single entry point
 * Risk: 2/10 (LOW) - Wrapper pattern with existing components
 */

import { HybridRAGReranker } from './rag-hybrid-reranker';
import { AgenticRAGEnhancement } from './agentic-rag-enhancement';
import { TemporalRAGEnhancement } from './rag-temporal-enhancement';
import { MultimodalDocumentParser } from './rag-multimodal-parser';
import { RAGEvaluator } from './rag-evaluation';
import { RAGEdgeCaseHandler } from './rag-edge-case-handler';
import { ragMonitor } from './rag-monitoring';

export interface RAGOptions {
  topK?: number;
  confidenceThreshold?: number;
  includeProvenance?: boolean;
  temporalScope?: 'latest' | 'historical' | 'all';
  runEvaluation?: boolean;
  conflictResolution?: 'latest_upload' | 'latest_document_date' | 'highest_confidence';
  conversationId?: string; // 🔧 FIX: Add conversation context support
}

export interface RAGResponse {
  success: boolean;
  response?: string;
  sources?: any[];
  confidence?: number;
  metadata?: any;
  abstained?: boolean;
  reason?: string;
  suggestedAction?: string;
}

export interface QueryAnalysis {
  strategy: 'simple' | 'complex' | 'temporal' | 'multi_doc' | 'comparative';
  isTemporalQuery: boolean;
  isComplexQuery: boolean;
  decomposedQueries: string[];
}

export class UnifiedRAGPipeline {
  private hybridReranker: HybridRAGReranker;
  private agenticEnhancer: AgenticRAGEnhancement;
  private temporalEnhancer: TemporalRAGEnhancement;
  private multimodalParser: MultimodalDocumentParser;
  private evaluator: RAGEvaluator;
  private edgeCaseHandler: RAGEdgeCaseHandler;
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    
    // Initialize existing components - NO rewrite needed
    this.hybridReranker = new HybridRAGReranker(tenantId); // 🎯 SURGICAL FIX: Pass tenant context
    this.agenticEnhancer = new AgenticRAGEnhancement(tenantId); // 🎯 SCHEMA FIX: Pass tenant context
    this.temporalEnhancer = new TemporalRAGEnhancement(tenantId); // 🎯 SCHEMA FIX: Pass tenant context
    this.multimodalParser = new MultimodalDocumentParser(tenantId);
    this.evaluator = new RAGEvaluator();
    this.edgeCaseHandler = new RAGEdgeCaseHandler();
  }

  /**
   * Main entry point - replaces scattered RAG calls
   */
  async processQuery(query: string, options: RAGOptions = {}): Promise<RAGResponse> {
    const startTime = Date.now();
    
    try {
      // Step 0: 🔧 FIX - Apply conversation memory enhancement
      let enhancedQuery = query;
      if (options.conversationId) {
        try {
          enhancedQuery = await this.agenticEnhancer.enhanceWithMemory(
            query, 
            this.tenantId, 
            options.conversationId
          );
          console.log(`💭 [Conversation Context] Enhanced query from: "${query}" to: "${enhancedQuery}"`);
        } catch (error) {
          console.warn('Conversation context enhancement failed, using original query:', error);
          enhancedQuery = query; // Fallback to original
        }
      }

      // Step 1: Check for document availability first
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { count: documentCount } = await supabase
        .from('documents')
        .select('id', { count: 'exact' })
        .eq('tenant_id', this.tenantId)
        .eq('processing_status', 'completed');
      
      console.log(`📊 [RAG CONTEXT] Found ${documentCount || 0} completed documents for tenant ${this.tenantId}`);
      
      // Step 1: Edge case handling with proper context
      const edgeCase = await this.edgeCaseHandler.handleEdgeCases(enhancedQuery, {
        documentCount: documentCount || 0
      });
      if (edgeCase.handled) {
        console.log(`🚫 [EDGE CASE] ${edgeCase.errorType}: ${edgeCase.fallbackResponse}`);
        return {
          success: false,
          abstained: true,
          reason: edgeCase.errorType,
          response: edgeCase.fallbackResponse,
          suggestedAction: edgeCase.suggestedAction
        };
      }

      // Step 2: Analyze query complexity and routing
      const analysis = await this.analyzeQuery(enhancedQuery);
      
      // Step 3: Route to appropriate pipeline
      let response: RAGResponse;
      
      // 🎯 SURGICAL REMOVAL TEST 2: Bypass TemporalRAGEnhancement
      console.log(`🚀 [SURGICAL TEST 2] TemporalRAGEnhancement removed - all queries use simple strategy`);
      
      // Always use simple query strategy (temporal routing removed)
      response = await this.handleSimpleQuery(enhancedQuery, options);

      // Step 4: Performance tracking
      const duration = Date.now() - startTime;
      ragMonitor.trackSearch(
        this.tenantId, 
        duration, 
        response.sources?.length || 0, 
        'hybrid'
      );

      // Step 5: Optional evaluation
      if (options.runEvaluation && response.success) {
        response.metadata = {
          ...response.metadata,
          evaluation: await this.runEvaluation(query, response)
        };
      }

      return response;
      
    } catch (error) {
      console.error('Unified RAG Pipeline error:', error);
      
      // Fallback to basic search
      return this.handleFallback(query, error);
    }
  }

  /**
   * Query analysis and routing logic
   */
  private async analyzeQuery(query: string): Promise<QueryAnalysis> {
    // 🎯 SURGICAL REMOVAL TEST 1: Bypass AgenticRAGEnhancement completely
    console.log(`🔍 [QUERY ANALYSIS - SIMPLIFIED] Bypassing agentic analysis for: "${query}"`);
    console.log(`🚀 [SURGICAL TEST 1] AgenticRAGEnhancement removed - using direct routing`);
    
    // Direct routing without external AI calls
    const isTemporalQuery = /latest|recent|last|ago|between|from.*to|changed|updated/i.test(query);
    
    return {
      strategy: isTemporalQuery ? 'temporal' : 'simple',  // Simplified routing
      isTemporalQuery,
      isComplexQuery: false,  // No complex queries without agentic analysis
      decomposedQueries: [query]
    };
  }

  /**
   * Handle temporal queries
   */
  private async handleTemporalQuery(query: string, options: RAGOptions): Promise<RAGResponse> {
    const temporalContext = await this.temporalEnhancer.queryWithTemporalContext(
      query,
      this.tenantId,
      {
        temporalScope: options.temporalScope || 'latest',
        entityResolution: true,
        relationshipMapping: true,
        conflictResolution: options.conflictResolution || 'latest_document_date'
      }
    );

    return {
      success: true,
      response: temporalContext.response,
      sources: temporalContext.results || [],
      confidence: 0.8, // Temporal queries have good confidence
      metadata: {
        ...temporalContext.metadata,
        strategy: 'temporal',
        temporalContextUsed: true
      }
    };
  }

  /**
   * Handle complex multi-document queries
   */
  private async handleComplexQuery(
    query: string, 
    analysis: QueryAnalysis, 
    options: RAGOptions
  ): Promise<RAGResponse> {
    // Use enhanced pipeline with all improvements
    const enhancedResponse = await this.hybridReranker.enhancedRAGPipeline(
      query,
      this.tenantId,
      {
        topK: options.topK || 10,
        confidenceThreshold: options.confidenceThreshold || 0.7,
        includeProvenance: options.includeProvenance !== false
      }
    );

    // Apply agentic reasoning for complex queries
    if (analysis.isComplexQuery && enhancedResponse.success) {
      try {
        const agenticAnalysis = await this.agenticEnhancer.analyzeQuery(query, this.tenantId);
        const searchResults = enhancedResponse.sources || [];
        
        const agenticResponse = await this.agenticEnhancer.synthesizeWithReasoning(
          agenticAnalysis,
          searchResults,
          this.tenantId
        );

        if (agenticResponse) {
          enhancedResponse.response = agenticResponse.response;
          enhancedResponse.confidence = agenticResponse.confidence;
          enhancedResponse.metadata = {
            ...enhancedResponse.metadata,
            reasoningSteps: agenticResponse.reasoning,
            strategy: 'complex_agentic'
          };
        }
      } catch (error) {
        console.warn('Agentic enhancement failed, using base response:', error);
      }
    }

    return enhancedResponse;
  }

  /**
   * Handle simple queries
   */
  private async handleSimpleQuery(query: string, options: RAGOptions): Promise<RAGResponse> {
    const threshold = options.confidenceThreshold || 0.4;
    console.log(`🔧 [SIMPLE QUERY] Processing: "${query}" with threshold ${threshold}`);
    console.log(`🚀 [DEPLOYMENT] RAG Pipeline v2.1 - Keyword extraction enabled`);
    console.log(`📊 [OPTIONS] Received: topK=${options.topK}, threshold=${options.confidenceThreshold}`);
    
    const result = await this.hybridReranker.enhancedRAGPipeline(
      query,
      this.tenantId,
      {
        topK: options.topK || 5,
        confidenceThreshold: threshold,  // 🎯 FINAL FIX: Use the threshold variable that respects passed options
        includeProvenance: options.includeProvenance !== false
      }
    );
    
    console.log(`📊 [SIMPLE QUERY RESULT] Success: ${result.success}, Sources: ${result.sources?.length || 0}`);
    return result;
  }

  /**
   * Fallback when all else fails
   */
  private async handleFallback(query: string, error: any): Promise<RAGResponse> {
    console.error('RAG Pipeline fallback triggered:', error);
    
    return {
      success: false,
      abstained: true,
      reason: 'system_error',
      response: "I encountered an issue processing your query. Please try rephrasing your question or contact support if the issue persists.",
      suggestedAction: "Try a simpler, more specific question.",
      metadata: {
        strategy: 'fallback',
        error: error.message
      }
    };
  }

  /**
   * Run evaluation if requested
   */
  private async runEvaluation(query: string, response: RAGResponse): Promise<any> {
    try {
      // Create a mock gold standard query for evaluation
      const goldQuery = {
        id: 'live-query',
        query,
        expectedAnswer: '',
        requiredFacts: [],
        category: 'factual' as const,
        difficulty: 'medium' as const
      };

      return await this.evaluator.evaluateQuery(goldQuery, {
        answer: response.response || '',
        contexts: response.sources?.map((s: any) => s.content || s.source) || [],
        relevanceScores: response.sources?.map((s: any) => s.confidence || 0.5) || []
      });
      
    } catch (error) {
      console.warn('Evaluation failed:', error);
      return { error: 'evaluation_failed' };
    }
  }

  /**
   * Parse documents using multimodal parser
   */
  async parseDocument(file: Buffer, mimeType: string, fileName?: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      const result = await this.multimodalParser.parseDocument(file, mimeType, fileName);
      
      const duration = Date.now() - startTime;
      ragMonitor.trackParseOperation(
        this.tenantId,
        duration,
        true,
        result.metadata.parse_method,
        mimeType
      );
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      ragMonitor.trackParseOperation(
        this.tenantId,
        duration,
        false,
        'basic',
        mimeType
      );
      
      throw error;
    }
  }

  /**
   * Get system health and metrics
   */
  getSystemHealth(): any {
    return {
      tenantId: this.tenantId,
      components: {
        hybridReranker: !!this.hybridReranker,
        agenticEnhancer: !!this.agenticEnhancer,
        temporalEnhancer: !!this.temporalEnhancer,
        multimodalParser: !!this.multimodalParser,
        evaluator: !!this.evaluator,
        edgeCaseHandler: !!this.edgeCaseHandler
      },
      metrics: ragMonitor.getMetricsSummary(this.tenantId)
    };
  }
}
