/**
 * Embeddings Generation - Vercel AI Gateway
 * 
 * Uses Vercel AI Gateway API key for unified access to embeddings.
 * OpenRouter is used only for LLM completions (doesn't support /embeddings).
 * 
 * Benefits:
 * - Built-in observability in Vercel dashboard
 * - Automatic failover across providers
 * - Unified cost tracking
 * - No need for separate OpenAI key
 * 
 * Atomic operation: text → vector
 */

import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { EmbeddingError } from '../utils/errors';
import { RAG_CONFIG } from '../config';

// Configure to use AI Gateway
const embeddingModel = openai.embedding(RAG_CONFIG.embeddings.model, {
  apiKey: process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_GATEWAY_API_KEY ? 'https://ai-gateway.vercel.sh/v1' : undefined,
});

/**
 * Generate single embedding (for queries)
 * 
 * Uses Vercel AI Gateway - automatically routes through gateway when deployed.
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
      model: embeddingModel,
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
 * Uses Vercel AI Gateway - automatically routes through gateway when deployed.
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
      model: embeddingModel,
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

