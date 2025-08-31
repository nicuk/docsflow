import { NextRequest, NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { getCORSHeaders } from '@/lib/utils';
import { getTenantPrompt, calculateTenantConfidence } from '@/lib/tenant-prompts';
import { ConfidenceScoring } from '@/lib/confidence-scoring';
import { RAGPipelineFactory } from '@/lib/rag-pipeline-factory';
import { validateTenantContext } from '@/lib/api-tenant-validation';
import { CitationEnhancer } from '@/lib/citation-enhancer';
import { CircuitBreakerFactory } from '@/lib/circuit-breaker';
import { degradationManager } from '@/lib/emergency-degradation';
import { OpenRouterClient, MODEL_CONFIGS } from '@/lib/openrouter-client';

// Initialize OpenRouter client for chat (lazy-loaded)
let openRouterClient: OpenRouterClient | null = null;

// Initialize Google AI model (keep as fallback)
const googleAI = process.env.GOOGLE_GENERATIVE_AI_API_KEY 
  ? google('gemini-2.0-flash')
  : null;

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

    // 🚀 UNIFIED: Use RAG Pipeline for everything
    const ragPipeline = RAGPipelineFactory.createPipeline(tenantId);
    
    const ragResponse = await ragPipeline.processQuery(message, {
      topK: 8,
      confidenceThreshold: 0.6,
      includeProvenance: true,
      temporalScope: 'all',
      conversationId: conversationId // 🔧 FIX: Connect conversation context
    });
    
    console.log(`🤖 Unified RAG: ${ragResponse.metadata?.strategy || 'standard'} strategy, confidence: ${ragResponse.confidence}`);

    // Handle RAG abstention (when confidence is too low)
    if (!ragResponse.success || ragResponse.abstained) {
      return NextResponse.json({
        answer: ragResponse.response || 'I don\'t have enough information to answer this question confidently.',
        sources: [],
        confidence: ragResponse.confidence || 0.3,
        confidence_level: 'low',
        confidence_explanation: ragResponse.reason || 'Insufficient information',
        metadata: {
          strategy: 'unified_rag_abstention',
          abstained: true
        }
      }, { headers: corsHeaders });
    }

    // Build context for LLM generation
    const context = ragResponse.sources?.map((source: any) => ({
      content: source.content || source.source || '',
      source: source.metadata?.filename || source.id || 'Document',
      document_id: source.document_id || source.id || 'unknown'
    })) || [];

    if (context.length === 0) {
      return NextResponse.json({
        answer: 'I couldn\'t find any relevant information in your documents to answer this question.',
        sources: [],
        confidence: 0.2,
        confidence_level: 'very_low',
        confidence_explanation: 'No relevant documents found',
        metadata: {
          strategy: 'no_context_found'
        }
      }, { headers: corsHeaders });
    }

    // Get tenant-specific prompt
    const tenantPromptConfig = getTenantPrompt(tenantSubdomain);
    
    // Generate final answer using OpenRouter with fallback
    const contextText = context.map(ctx => `Source: ${ctx.source}\nContent: ${ctx.content}`).join('\n\n');
    
    const messages = [
      {
        role: 'system' as const,
        content: tenantPromptConfig.systemPrompt
      },
      {
        role: 'user' as const,
        content: `Context from documents:
${contextText}

User Question: ${message}

Provide a helpful, accurate answer based ONLY on the provided context. If the context doesn't contain enough information, say so clearly. Include relevant details and be specific.`
      }
    ];

    let answerText: string;
    let modelUsed: string;
    
    try {
      // Lazy-load OpenRouter client
      if (!openRouterClient) {
        openRouterClient = new OpenRouterClient();
      }
      
      const llmResponse = await openRouterClient.generateWithFallback(
        MODEL_CONFIGS.CHAT,
        messages,
        {
          max_tokens: 500,
          temperature: 0.1
        }
      );
      
      answerText = llmResponse.response;
      modelUsed = llmResponse.modelUsed;
      console.log(`🤖 Chat response generated using ${modelUsed} (${llmResponse.fallbackCount} fallbacks)`);
      
    } catch (openRouterError) {
      console.warn('OpenRouter fallback chain failed, using Gemini:', openRouterError);
      
      // Fallback to Gemini if all OpenRouter models fail
      if (!googleAI) {
        throw new Error('No AI models available');
      }
      
      const { text } = await generateText({
        model: googleAI,
        prompt: messages.map(m => m.content).join('\n\n'),
        maxTokens: 500,
        temperature: 0.1,
      });
      
      answerText = text;
      modelUsed = 'gemini-2.0-flash (emergency fallback)';
      console.log('🚨 Used Gemini emergency fallback');
    }

    // Calculate confidence and enhance citations
    const confidenceResult = ConfidenceScoring.calculateEnhancedConfidence(context, message, answerText);
    
    // Enhance citations in the response
    const citedResponse = CitationEnhancer.enhanceWithCitations(answerText, context);
    
    const responseTime = Date.now() - startTime;
    
    // Return successful response
    return NextResponse.json({
      answer: citedResponse.text,
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
        tenant_subdomain: tenantSubdomain
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