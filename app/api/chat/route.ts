import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

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
    
    // Get tenant from subdomain or auth
    const url = new URL(request.url);
    const subdomain = url.hostname.split('.')[0];
    const tenantId = subdomain === 'localhost' ? 'demo' : subdomain;

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

    // Step 2: Perform semantic search to find relevant document chunks
    let chunks;
    try {
      const { data, error } = await supabase.rpc('similarity_search', {
        query_embedding: queryEmbedding,
        match_threshold: 0.75,
        match_count: 10,
        tenant_id: tenantId,
        access_level: 1
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

    // Step 4: Generate response using Google Gemini
    const chatModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `You are a business intelligence assistant helping analyze business documents. 
Based on the following document context, answer the user's question accurately and professionally.

CONTEXT FROM DOCUMENTS:
${context.map((ctx: Context, idx: number) => `
Source ${idx + 1}: ${ctx.source}
Content: ${ctx.content}
---`).join('\n')}

USER QUESTION: ${message}

INSTRUCTIONS:
- Provide a clear, professional answer based on the document context
- If the context doesn't contain enough information, say so honestly
- Always cite your sources using the format "According to [filename]..."
- Focus on business insights and actionable information
- Be concise but thorough

ANSWER:`;

    const result = await chatModel.generateContent(prompt);
    const response = result.response;
    const answerText = response.text();

    // Step 5: Calculate confidence score based on context relevance
    const confidence = relevantChunks.length > 0 ? 
      Math.min(0.9, 0.5 + (relevantChunks.length * 0.1)) : 0.3;

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
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
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
  });
} 