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

    const supabase = getSupabaseClient();
    
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
    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const embeddingResult = await embeddingModel.embedContent(message);
    const queryEmbedding = embeddingResult.embedding.values;

    // Step 2: Perform semantic search to find relevant document chunks
    const { data: chunks, error } = await supabase.rpc('similarity_search', {
      query_embedding: queryEmbedding, // Pass the embedding array directly
      match_threshold: 0.75, // Higher threshold for better accuracy
      match_count: 10, // Retrieve more chunks for better context
      tenant_id: tenantId,
      access_level: 1 // TODO: Replace with actual user access level
    });

    if (error) {
      console.error('Vector search error:', error);
      return NextResponse.json(
        { error: 'Failed to perform vector search' },
        { status: 500 }
      );
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

  } catch (error) {
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