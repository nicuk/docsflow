import { NextRequest, NextResponse } from 'next/server';
// 🎯 RUNTIME FIX: Restore imports needed for build
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { getCORSHeaders } from '@/lib/utils';
import { getTenantPrompt, calculateTenantConfidence } from '@/lib/tenant-prompts';
import { ConfidenceScoring } from '@/lib/confidence-scoring';
// 🆕 NEW: Pinecone + LangChain RAG Module
import { queryWorkflow } from '@/lib/rag';
import { validateTenantContext } from '@/lib/api-tenant-validation';
import { CitationEnhancer } from '@/lib/citation-enhancer';
import { CircuitBreakerFactory } from '@/lib/circuit-breaker';
import { degradationManager } from '@/lib/emergency-degradation';
import { OpenRouterClient, MODEL_CONFIGS } from '@/lib/openrouter-client';
import { queryClassifier } from '@/lib/query-complexity-classifier';
import { costMonitor } from '@/lib/model-cost-monitor';
import { createClient } from '@supabase/supabase-js';
import { detectGibberish, getDefaultPersona } from '@/lib/persona-prompt-generator';
import { logPersonaMetrics } from '@/lib/persona-metrics';

// Initialize OpenRouter client for chat (lazy-loaded)
let openRouterClient: OpenRouterClient | null = null;

// Initialize Google AI model (keep as fallback)
const googleAI = process.env.GOOGLE_GENERATIVE_AI_API_KEY 
  ? google('gemini-2.0-flash')
  : null;

/**
 * 🎯 NEW: Get tenant AI persona from database
 * Returns persona settings or defaults if not customized
 */
async function getTenantPersona(tenantId: string) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: persona, error } = await supabase
      .from('tenant_ai_persona')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching persona:', error);
      return getDefaultPersona();
    }
    
    if (!persona) {
      console.log(`No custom persona for tenant ${tenantId}, using default`);
      return getDefaultPersona();
    }
    
    // Update last_used_at timestamp
    supabase
      .from('tenant_ai_persona')
      .update({ last_used_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .then(() => console.log(`✅ Persona last_used_at updated`));
    
    console.log(`✅ Using custom persona for tenant ${tenantId}: ${persona.role}`);
    return persona;
    
  } catch (error) {
    console.error('Error in getTenantPersona:', error);
    return getDefaultPersona();
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);
  
  try {
    // 🔒 SECURE: Validate tenant context (subdomain-based isolation)
    const tenantValidation = await validateTenantContext(request, {
      requireAuth: true // ✅ PRODUCTION: Authentication enabled
    });

    if (!tenantValidation.isValid) {
      return NextResponse.json(
        { 
          error: tenantValidation.error,
          security_violation: 'Invalid tenant context'
        },
        { status: tenantValidation.statusCode || 400, headers: corsHeaders }
      );
    }

    const tenantId = tenantValidation.tenantId!;
    const tenantSubdomain = tenantValidation.tenantData?.subdomain || 'unknown';
    
    console.log('Chat API - Subdomain:', tenantSubdomain, 'Tenant UUID:', tenantId);
    console.log('🔍 [CHAT API v7] DEBUGGING RAG ABSTENTION: Request received for message processing');
    console.log('🚨 [CHAT API v7] TENANT CONTEXT CHECK:', { tenantId, tenantSubdomain });

    // PLAN ENFORCEMENT: Check conversation limits
    try {
      const { enforceSubscriptionLimits } = await import('@/lib/plan-enforcement');
      const limitCheck = await enforceSubscriptionLimits(tenantId, 'conversation');
      
      if (!limitCheck.allowed) {
        return NextResponse.json({
          error: limitCheck.message || 'Monthly conversation limit reached',
          upgradeRequired: limitCheck.upgradeRequired,
          current: limitCheck.current,
          limit: limitCheck.limit,
          resetDate: limitCheck.resetDate
        }, { status: 402, headers: corsHeaders }); // Payment Required
      }
    } catch (limitError) {
      console.error('Error checking conversation limits:', limitError);
      // Continue with chat on error to avoid blocking users
    }

    // 🎯 SURGICAL FIX: Establish authentication context for RAG database queries
    // 🎯 CLERK MIGRATION: Authentication is handled by validateTenantContext
    // No need to set Supabase session - RAG queries work with tenant_id directly
    console.log('✅ [CHAT API] Using tenant-scoped queries (no session needed)');

    // Check if AI service is available
    if (!googleAI) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    // 🚨 CIRCUIT BREAKER: Get AI circuit breaker
    const aiCircuitBreaker = CircuitBreakerFactory.getGoogleAI();

    // Parse request body
    const { message, documentIds, conversationId } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    
    // 🎭 LOAD PERSONA: Load once at start (used by gibberish check and later)
    const tenantPersona = await getTenantPersona(tenantId);

    // 🎯 NEW: Detect gibberish and return fallback prompt
    if (detectGibberish(message)) {
      console.log('🚨 [GIBBERISH DETECTED] Query appears unclear:', message);
      const fallbackResponse = tenantPersona.fallback_prompt || getDefaultPersona().fallback_prompt;
      
      // 🎯 METRICS: Log gibberish detection
      logPersonaMetrics({
        tenant_id: tenantId,
        persona_role: tenantPersona.role,
        query: message,
        response: fallbackResponse,
        response_length: fallbackResponse.length,
        sources_count: 0,
        confidence_score: 0.2,
        response_time_ms: Date.now() - startTime,
        used_custom_persona: tenantPersona.role !== 'Document Intelligence Assistant',
        used_fallback: true,
        gibberish_detected: true,
        metadata: {
          strategy: 'gibberish_fallback'
        }
      }).catch(err => console.error('Metrics logging failed:', err));
      
      return NextResponse.json({
        response: fallbackResponse,
        sources: [],
        confidence: 0.2,
        confidence_level: 'low',
        confidence_explanation: 'Query unclear or unrecognized - using fallback guidance',
        metadata: {
          strategy: 'gibberish_fallback',
          detected_issue: 'unclear_query',
          persona_role: tenantPersona.role
        }
      }, { headers: corsHeaders });
    }

    // 🔍 METADATA QUERY DETECTION: Check if query is about document metadata (count, list)
    const { isMetadataQuery, handleMetadataQuery } = await import('@/lib/metadata-query-detector');
    
    if (isMetadataQuery(message)) {
      console.log('📊 [METADATA QUERY] Detected metadata query, bypassing RAG');
      const metadataResult = await handleMetadataQuery(message, tenantId);
      
      // Return metadata query result directly
      return NextResponse.json({
        response: metadataResult.answer,
        answer: metadataResult.answer, // Compatibility
        sources: metadataResult.sources,
        confidence: metadataResult.confidence,
        metadata: metadataResult.metadata,
        persona_used: tenantPersona.role,
      }, { headers: corsHeaders });
    }
    
    // 🆕 NEW: Use Pinecone + LangChain RAG Module
    console.log('🚀 [CHAT API v9] PINECONE MIGRATION: Querying new RAG module');
    console.log('🔧 [CHAT API v9] Tenant:', tenantId, 'Query:', message);
    
    const ragResult = await queryWorkflow({
      query: message,
      tenantId: tenantId,
      topK: 5, // Simplified: 5 chunks is optimal
    });
    
    console.log(`🤖 [RAG v9] New RAG: success: ${ragResult.success}, confidence: ${ragResult.confidence}%`);
    console.log(`🎯 [RAG v9] Abstained: ${ragResult.abstained || false}, Reason: ${ragResult.reason || 'N/A'}`);
    console.log(`📊 [RAG v9] Sources found: ${ragResult.sources?.length || 0} chunks`);
    console.log(`⚡ [RAG v9] Duration: ${ragResult.metrics.duration}ms`);
    
    // Transform new result to match old structure (for compatibility)
    const ragResponse = {
      success: ragResult.success,
      abstained: ragResult.abstained || false,
      reason: ragResult.reason,
      confidence: ragResult.confidence / 100, // Convert 0-100 to 0-1 scale
      response: ragResult.answer,
      sources: ragResult.sources?.map(source => ({
        content: source.content,
        source: source.filename,
        document_id: source.documentId,
        provenance: {
          source: source.filename,
          page: source.pageNumber,
        },
        metadata: {
          filename: source.filename,
          page: source.pageNumber,
        },
        hybridScore: source.score,
        confidence: source.score,
      })) || [],
      metadata: {
        strategy: 'pinecone_langchain',
        model: ragResult.metrics.model,
        duration: ragResult.metrics.duration,
      },
    };
    
    // 🎯 CATEGORY BOOST: Auto-detect query intent and boost matching categories
    if (ragResponse.sources && ragResponse.sources.length > 0) {
        const { applyCategoryLogic } = await import('@/lib/category-boost');
        ragResponse.sources = applyCategoryLogic(ragResponse.sources as any, message, {
          autoDetect: true // Auto-detect category from query
        }) as any;
        
        // Re-sort after boosting
        ragResponse.sources.sort((a, b) => {
          const scoreA = a.hybridScore || a.confidence || 0;
          const scoreB = b.hybridScore || b.confidence || 0;
          return scoreB - scoreA;
        });
        
        console.log(`🔍 [RAG v8] First chunk preview: "${ragResponse.sources[0].content?.substring(0, 100)}..."`);
        const hasRevenue = ragResponse.sources[0].content?.toLowerCase().includes('revenue');
        console.log(`💰 [RAG v8] First chunk contains 'revenue': ${hasRevenue}`);
    }

    // Handle RAG abstention (when confidence is too low)
    if (!ragResponse.success || ragResponse.abstained) {
      console.log('🔄 [RAG ABSTENTION] RAG abstained due to low confidence');
      console.log(`🔍 [RAG DEBUG] Abstention reason: ${ragResponse.reason}, confidence: ${ragResponse.confidence}`);

      // Original abstention response if fallback also fails
      return NextResponse.json({
        response: ragResponse.response || 'I don\'t have enough information to answer this question confidently.', // 🎯 SURGICAL FIX: Frontend expects 'response' field
        sources: [],
        confidence: ragResponse.confidence || 0.3,
        confidence_level: 'low',
        confidence_explanation: ragResponse.reason || 'Insufficient information',
        metadata: {
          strategy: 'unified_rag_abstention',
          abstained: true,
          fallback_attempted: true
        }
      }, { headers: corsHeaders });
    }

    // Build context for LLM generation
    // 🎯 FIX: Properly extract document metadata from RAG sources
    const context = ragResponse.sources?.map((source: any) => {
      const documentName = source.source || source.provenance?.source || source.metadata?.filename || 'Unknown Document';
      return {
        content: source.content || source.source || '',
        snippet: source.content?.substring(0, 200) || '', // First 200 chars for preview
        document: documentName, // For internal use
        filename: documentName, // 🎯 FIX: Add for frontend compatibility
        source: documentName,   // 🎯 FIX: Add for frontend compatibility
        documentId: source.document_id || source.id || null, // Real UUID from chunks table
        document_id: source.document_id || source.id || null, // 🎯 FIX: Add snake_case for frontend
        page: source.provenance?.page || source.metadata?.page,
        confidence: source.confidence || source.rerankedScore || source.hybridScore || 0.7,
        metadata: source.metadata // 🎯 FIX: Pass through original metadata
      };
    }) || [];

    if (context.length === 0) {
      return NextResponse.json({
        response: 'I couldn\'t find any relevant information in your documents to answer this question.', // 🎯 SURGICAL FIX: Frontend expects 'response' field
        sources: [],
        confidence: 0.2,
        confidence_level: 'very_low',
        confidence_explanation: 'No relevant documents found',
        metadata: {
          strategy: 'no_context_found'
        }
      }, { headers: corsHeaders });
    }

    // Generate final answer using OpenRouter with fallback (persona already loaded earlier)
    const contextText = context.map(ctx => `Source: ${ctx.document}\nContent: ${ctx.content}`).join('\n\n');
    
    const messages = [
      {
        role: 'system' as const,
        content: tenantPersona.system_prompt || getDefaultPersona().system_prompt
      },
      {
        role: 'user' as const,
        content: `Context from documents:
${contextText}

User Question: ${message}

${tenantPersona.custom_instructions || 'Provide a helpful, accurate answer based ONLY on the provided context. If the context doesn\'t contain enough information, say so clearly. Include relevant details and be specific.'}`
      }
    ];

    let answerText: string;
    let modelUsed: string;
    
    // 🎯 SURGICAL: Classify query complexity before LLM selection
    const complexityAnalysis = queryClassifier.classify(message);
    console.log(`🎯 [COMPLEXITY CLASSIFIER] ${complexityAnalysis.reasoning}`);
    console.log(`📊 [CLASSIFIER] Stats:`, queryClassifier.getStatistics());
    
    // 🚨 SMART ROUTING: Select models based on complexity
    let selectedModels: string[];
    let shouldShowUpgradePrompt = false;
    
    // 🎯 TEMPORARY: Default to allowing all tiers (subscription system not implemented yet)
    const hasPremiumAI = false; // TODO: Implement subscription tiers
    
    switch (complexityAnalysis.complexity) {
      case 'simple':
        selectedModels = MODEL_CONFIGS.SIMPLE;
        console.log('🟢 [ROUTING] SIMPLE tier (Mistral-7B, fast & cheap)');
        break;
        
      case 'medium':
        selectedModels = MODEL_CONFIGS.MEDIUM;
        console.log('🟡 [ROUTING] MEDIUM tier (Llama-3.1-8B, balanced)');
        break;
        
      case 'complex':
        if (hasPremiumAI) {
          // Use premium models (Claude) for Enterprise or Professional+Premium
          selectedModels = MODEL_CONFIGS.PREMIUM;
          console.log('🔴 [ROUTING] COMPLEX tier with PREMIUM AI (Claude 3.5 Sonnet)');
          console.warn(`⚠️ [COST ALERT] Using premium model (Claude) - $0.012/query`);
        } else {
          // Use best cheap model + show upgrade prompt
          selectedModels = MODEL_CONFIGS.COMPLEX;
          shouldShowUpgradePrompt = true;
          console.log('🟡 [ROUTING] COMPLEX tier WITHOUT premium (best cheap model: qwen-2.5-7b)');
          console.log('💡 [UPSELL] Will show upgrade prompt for Premium AI');
        }
        break;
        
      default:
        selectedModels = MODEL_CONFIGS.MEDIUM;
    }
    
    try {
      // Lazy-load OpenRouter client
      if (!openRouterClient) {
        openRouterClient = new OpenRouterClient();
      }
      
      const llmResponse = await openRouterClient.generateWithFallback(
        selectedModels, // 🎯 Use complexity-based model selection
        messages,
        {
          max_tokens: 600,  // 🎯 FIX: Increased to 600 to prevent truncated responses
          temperature: 0.1
        }
      );
      
      answerText = llmResponse.response;
      modelUsed = llmResponse.modelUsed;
      console.log(`🤖 Chat response generated using ${modelUsed} (${llmResponse.fallbackCount} fallbacks)`);
      
      // 🚨 COST TRACKING: Monitor model usage and costs
      const estimatedTokens = Math.ceil((message.length + answerText.length) / 4); // Rough estimate
      costMonitor.trackUsage(modelUsed, estimatedTokens, complexityAnalysis.complexity);
      
    } catch (openRouterError) {
      console.warn('OpenRouter fallback chain failed, using Gemini:', openRouterError);
      
      // Fallback to Gemini if all OpenRouter models fail
      if (!googleAI) {
        throw new Error('No AI models available');
      }
      
      const { text } = await generateText({
        model: googleAI,
        prompt: messages.map(m => m.content).join('\n\n'),
        temperature: 0.1,
      });
      
      answerText = text;
      modelUsed = 'gemini-2.0-flash (emergency fallback)';
      console.log('🚨 Used Gemini emergency fallback');
    }

    // 💡 Add upgrade prompt for complex queries without premium AI
    if (shouldShowUpgradePrompt && complexityAnalysis.complexity === 'complex') {
      answerText += '\n\n---\n\n💡 **Tip:** This query involves complex analysis across multiple documents. For 30-40% more accurate responses on queries like this, consider upgrading to **Premium AI** (+$199/month) or our **Enterprise** tier, which includes Claude 3.5 Sonnet.';
    }
    
    // Calculate confidence and enhance citations
    const confidenceResult = ConfidenceScoring.calculateEnhancedConfidence(context, message, answerText);
    
    // Enhance citations in the response
    const citedResponse = CitationEnhancer.enhanceWithCitations(answerText, context);
    
    const responseTime = Date.now() - startTime;
    
    // 🎯 METRICS: Log persona usage and response quality (async, non-blocking)
    logPersonaMetrics({
      tenant_id: tenantId,
      persona_role: tenantPersona.role,
      query: message,
      response: citedResponse.text,
      response_length: citedResponse.text.length,
      sources_count: context.length,
      confidence_score: confidenceResult.score,
      response_time_ms: responseTime,
      used_custom_persona: tenantPersona.role !== 'Document Intelligence Assistant', // Check if not default
      used_fallback: false,
      gibberish_detected: false,
      metadata: {
        model_used: modelUsed,
        query_complexity: complexityAnalysis.complexity,
        confidence_level: confidenceResult.level
      }
    }).catch(err => console.error('Metrics logging failed:', err));
    
    // Return successful response
    return NextResponse.json({
      response: citedResponse.text, // 🎯 SURGICAL FIX: Frontend expects 'response' field
      sources: context,
      confidence: confidenceResult.score,
      confidence_level: confidenceResult.level,
      confidence_explanation: confidenceResult.explanation,
      citations: citedResponse.citations,
      metadata: {
        strategy: 'unified_rag_with_llm',
        model_used: modelUsed,
        response_time_ms: responseTime,
        source_count: context.length,
        tenant_subdomain: tenantSubdomain,
        // 🎯 NEW: Add complexity classification metadata
        query_complexity: complexityAnalysis.complexity,
        complexity_confidence: complexityAnalysis.confidence,
        complexity_factors: complexityAnalysis.factors,
        model_tier: complexityAnalysis.complexity === 'complex' ? 'premium' : 'standard'
      }
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  const corsHeaders = getCORSHeaders(request.headers.get('origin'));
  return NextResponse.json(
    { status: 'Chat API is running', unified_rag: true },
    { headers: corsHeaders }
  );
}