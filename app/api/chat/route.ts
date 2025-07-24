import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { getTenantPrompt, calculateTenantConfidence } from '@/lib/tenant-prompts';
import { getUserAccessLevel, extractTenantFromRequest } from '@/lib/auth-helpers';
import { performDeepSearch, buildSynthesizedContext } from '@/lib/deep-search';

// CORS headers for frontend integration
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
    ? 'https://v0-ai-saas-landing-page-lw.vercel.app' 
    : '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true',
};

// Initialize services - only when environment variables are available
const genAI = process.env.GOOGLE_AI_API_KEY ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY) : null;

function getSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration not available');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

interface Chunk {
  content: string;
  documents: { filename: string } | null;
  chunk_index: number;
  document_id: string;
}

interface Context {
  content: string;
  source: string;
  document_id: string;
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    // Check if services are available
    if (!genAI) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (error: any) {
      console.error('Supabase initialization error:', error);
      return NextResponse.json({ 
        error: 'Database service not available',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 });
    }
    
    // Get tenant from subdomain
    const tenantId = extractTenantFromRequest(request);

    // Parse request body
    const { message, documentIds } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Step 1: Generate embedding for the user's query
    let queryEmbedding;
    try {
      const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const embeddingResult = await embeddingModel.embedContent(message);
      queryEmbedding = embeddingResult.embedding.values;
    } catch (error: any) {
      console.error('Embedding generation error:', error);
      return NextResponse.json({ 
        error: 'Failed to process query',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 });
    }

    // Step 2: Get user access level and perform DEEP SEARCH with cross synthesis
    const userAccessLevel = await getUserAccessLevel(request, tenantId);

    let relevantChunks: Chunk[] = [];
    let deepSearchResult;
    let crossReferences: any[] = [];

    try {
      // 🚀 DEEP SEARCH: Multi-pass search with cross-document synthesis
      deepSearchResult = await performDeepSearch(message, tenantId, userAccessLevel, genAI);
      relevantChunks = deepSearchResult.chunks;
      crossReferences = deepSearchResult.crossReferences;
      
      console.log(`Deep search found ${relevantChunks.length} chunks with ${crossReferences.length} cross-references`);
      
    } catch (error: any) {
      console.error('Deep search error, falling back to basic search:', error);
      
      // Fallback to basic vector search
      try {
        const { data, error } = await supabase.rpc('similarity_search', {
          query_embedding: queryEmbedding,
          match_threshold: 0.85,
          match_count: 15,
          tenant_filter: tenantId,
          access_level_filter: userAccessLevel
        });

        if (error) {
          throw error;
        }
        
        relevantChunks = data || [];
             } catch (fallbackError: any) {
         console.error('Fallback search also failed:', fallbackError);
         return NextResponse.json({ 
           error: 'Search service unavailable',
           details: process.env.NODE_ENV === 'development' ? fallbackError.message : undefined
         }, { status: 500 });
       }
    }

    // 🔧 CRITICAL FIX: Prevent hallucination with empty context
    if (relevantChunks.length === 0) {
      return NextResponse.json({
        message: "I don't have any documents that contain information about your question. Please upload relevant documents or try rephrasing your query with more specific terms.",
        sources: [],
        confidence: 0,
        error: "no_relevant_context",
        suggestions: [
          "Upload documents related to your query",
          "Try using more specific keywords",
          "Check if you have the right access level for this information"
        ]
      }, { 
        status: 200,
        headers: corsHeaders 
      });
    }

    // Step 3: Prepare context from relevant chunks
    const context: Context[] = relevantChunks.map((chunk: Chunk) => ({
      content: chunk.content,
      source: `${chunk.documents && typeof chunk.documents === 'object' && 'filename' in chunk.documents ? chunk.documents.filename : 'unknown'} (chunk ${chunk.chunk_index + 1})`,
      document_id: chunk.document_id
    }));

    // Step 4: Get tenant configuration and generate response using Google Gemini
    let tenant;
    try {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('industry')
        .eq('subdomain', tenantId)
        .single();
      tenant = tenantData;
    } catch (error) {
      console.log('Tenant not found, using general prompts');
    }

    const promptConfig = getTenantPrompt(tenantId, tenant?.industry);
    
    // Build synthesized context with deep search results
    const contextString = deepSearchResult ? 
      buildSynthesizedContext(deepSearchResult) :
      context.map((ctx: Context, idx: number) => `
Source ${idx + 1}: ${ctx.source}
Content: ${ctx.content}
---`).join('\n');

    // Use tenant-specific prompt template with enhanced context
    const prompt = promptConfig.contextTemplate
      .replace('{context}', contextString)
      .replace('{query}', message);

    // Initialize chat model with tenant-specific system prompt
    const chatModel = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      systemInstruction: promptConfig.systemPrompt
    });

    const result = await chatModel.generateContent(prompt);
    const response = result.response;
    const answerText = response.text();

    // Step 5: Calculate enhanced confidence score with deep search bonuses
    const baseConfidence = deepSearchResult ? deepSearchResult.confidence : 
      (relevantChunks.length > 0 ? 
        relevantChunks.reduce((sum: number, chunk: any) => sum + (chunk.similarity || 0.5), 0) / relevantChunks.length : 0.3);
    
    const confidenceLevel = calculateTenantConfidence(
      baseConfidence, 
      tenant?.industry || 'general', 
      relevantChunks.length
    );
    
    // Enhanced confidence with deep search bonuses
    const crossRefBonus = crossReferences.length > 0 ? 0.1 : 0;
    const precisionBonus = relevantChunks.filter((c: any) => c.precision === 'high').length > 0 ? 0.05 : 0;
    
    const confidence = Math.min(0.99, 
      (confidenceLevel === 'high' ? 0.9 : 
       confidenceLevel === 'medium' ? 0.7 : 0.4) + crossRefBonus + precisionBonus
    );

    // Step 6: Store search in history
    const responseTime = Date.now() - startTime;
    
    try {
      await supabase
        .from('search_history')
        .insert({
          tenant_id: tenantId,
          query: message,
          response: answerText,
          document_ids: relevantChunks.map((chunk: Chunk) => chunk.document_id),
          confidence_score: confidence,
          response_time_ms: responseTime
        });
    } catch (historyError) {
      console.error('Failed to store search history:', historyError);
      // Don't fail the request if history storage fails
    }

    // Step 7: Return enhanced structured response with deep search data
    return NextResponse.json({
      answer: answerText,
      sources: context.map((ctx: Context) => ({
        filename: ctx.source.split(' (chunk')[0],
        content: ctx.content.substring(0, 200) + '...',
        document_id: ctx.document_id
      })),
      confidence,
      responseTime,
      metadata: {
        chunksFound: relevantChunks.length,
        searchStrategy: documentIds ? 'specific_documents' : 'all_documents',
        // 🚀 ENHANCED: Deep search metadata
        deep_search: {
          total_chunks: relevantChunks.length,
          high_precision_chunks: relevantChunks.filter((c: any) => c.precision === 'high').length,
          cross_references: crossReferences.length,
          synthesis_applied: deepSearchResult ? true : false
        }
      },
      // 🚀 NEW: Cross-document relationships
      cross_references: crossReferences.map(ref => ({
        relationship: ref.relationship,
        strength: Math.round(ref.strength * 100),
        evidence: ref.evidence[0] || 'Cross-document relationship detected'
      }))
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Optional: Add streaming support for real-time responses
export async function GET(request: NextRequest) {
  // Health check endpoint
  return NextResponse.json({ 
    status: 'ok',
    service: 'SME Intelligence Chat API',
    timestamp: new Date().toISOString()
  }, { headers: corsHeaders });
} 