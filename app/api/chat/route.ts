import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { getTenantPrompt, calculateTenantConfidence } from '@/lib/tenant-prompts';
import { getUserAccessLevel, extractTenantFromRequest } from '@/lib/auth-helpers';

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

    // Step 2: Get user access level and perform semantic search
    const userAccessLevel = await getUserAccessLevel(request, tenantId);

    let chunks;
    try {
      const { data, error } = await supabase.rpc('similarity_search', {
        query_embedding: queryEmbedding,
        match_threshold: 0.75,
        match_count: 10,
        tenant_filter: tenantId,
        access_level_filter: userAccessLevel
      });

      if (error) {
        console.error('Vector search error:', error);
        // Fallback to simple text search if vector search fails
        const { data: fallbackChunks, error: fallbackError } = await supabase
          .from('document_chunks')
          .select('id, content, chunk_index, document_id')
          .ilike('content', `%${message}%`)
          .limit(5);
        
        if (fallbackError) {
          throw fallbackError;
        }
        
        chunks = fallbackChunks || [];
        console.log('Using fallback text search');
      } else {
        chunks = data || [];
      }
    } catch (error: any) {
      console.error('Search error:', error);
      return NextResponse.json({ 
        error: 'Search service unavailable',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 });
    }

    const relevantChunks: Chunk[] = chunks || [];

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
    
    // Build context string
    const contextString = context.map((ctx: Context, idx: number) => `
Source ${idx + 1}: ${ctx.source}
Content: ${ctx.content}
---`).join('\n');

    // Use tenant-specific prompt template
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

    // Step 5: Calculate tenant-specific confidence score
    const avgSimilarity = relevantChunks.length > 0 ? 
      relevantChunks.reduce((sum: number, chunk: any) => sum + (chunk.similarity || 0.5), 0) / relevantChunks.length : 0.3;
    
    const confidenceLevel = calculateTenantConfidence(
      avgSimilarity, 
      tenant?.industry || 'general', 
      relevantChunks.length
    );
    
    const confidence = confidenceLevel === 'high' ? 0.9 : 
                     confidenceLevel === 'medium' ? 0.7 : 0.4;

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

    // Step 7: Return structured response
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
        searchStrategy: documentIds ? 'specific_documents' : 'all_documents'
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

// Optional: Add streaming support for real-time responses
export async function GET(request: NextRequest) {
  // Health check endpoint
  return NextResponse.json({ 
    status: 'ok',
    service: 'SME Intelligence Chat API',
    timestamp: new Date().toISOString()
  }, { headers: corsHeaders });
} 