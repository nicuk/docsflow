/**
 * Embeddings Generation - Vercel AI Gateway
 * 
 * Uses Vercel AI SDK which automatically routes through AI Gateway when deployed.
 * OpenRouter is used only for LLM completions (doesn't support /embeddings).
 * 
 * How it works:
 * - AI SDK detects AI_GATEWAY_API_KEY environment variable
 * - Automatically routes through https://ai-gateway.vercel.sh/v1
 * - No manual configuration needed!
 * 
 * Benefits:
 * - Built-in observability in Vercel dashboard
 * - Automatic failover across providers
 * - Unified cost tracking
 * 
 * Atomic operation: text → vector
 */

import { embed, embedMany } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { EmbeddingError } from '../utils/errors';
import { RAG_CONFIG } from '../config';

// Configure OpenAI provider with explicit AI Gateway URL
// CRITICAL: Must set baseURL explicitly when using createOpenAI()
// Otherwise it calls OpenAI directly even with AI_GATEWAY_API_KEY
const openaiProvider = createOpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

/**
 * Generate single embedding (for queries)
 * 
 * Uses AI_GATEWAY_API_KEY to authenticate with Vercel AI Gateway.
 * Gateway automatically routes to the best available provider.
 * 
 * @param text - Text to embed
 * @returns 1536-dimensional vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new EmbeddingError('Cannot generate embedding for empty text');
  }
  
  try {
    const { embedding } = await embed({
      model: openaiProvider.embedding(RAG_CONFIG.embeddings.model),
      value: text,
    });
    
    if (!embedding || embedding.length !== RAG_CONFIG.embeddings.dimensions) {
      throw new EmbeddingError(
        `Invalid embedding dimensions: expected ${RAG_CONFIG.embeddings.dimensions}, got ${embedding?.length || 0}`
      );
    }
    
    return embedding;
  } catch (error: any) {
    console.error('[Embeddings] Error:', error);
    throw new EmbeddingError(`Failed to generate embedding: ${error.message}`, {
      textLength: text.length,
    });
  }
}

/**
 * Generate batch embeddings (for document ingestion)
 * 
 * AI SDK automatically routes through Vercel AI Gateway when AI_GATEWAY_API_KEY is set.
 * More efficient than multiple single calls.
 * 
 * @param texts - Array of texts to embed
 * @returns Array of 1536-dimensional vectors
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    throw new EmbeddingError('Cannot generate embeddings for empty array');
  }
  
  // Filter out empty texts
  const validTexts = texts.filter(t => t && t.trim().length > 0);
  
  if (validTexts.length === 0) {
    throw new EmbeddingError('All texts are empty');
  }
  
  try {
    const { embeddings } = await embedMany({
      model: openaiProvider.embedding(RAG_CONFIG.embeddings.model),
      values: validTexts,
    });
    
    if (!embeddings || embeddings.length !== validTexts.length) {
      throw new EmbeddingError(
        `Invalid embedding count: expected ${validTexts.length}, got ${embeddings?.length || 0}`
      );
    }
    
    return embeddings;
  } catch (error: any) {
    console.error('[Embeddings] Batch error:', error);
    throw new EmbeddingError(`Failed to generate batch embeddings: ${error.message}`, {
      textCount: texts.length,
    });
  }
}

