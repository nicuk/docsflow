/**
 * Embeddings Generation - Vercel AI Gateway (OpenAI-Compatible REST API)
 * 
 * Uses Vercel AI Gateway's OpenAI-compatible REST API for embeddings.
 * This is the correct way per Vercel docs - direct fetch() calls, not AI SDK!
 * 
 * https://vercel.com/docs/ai-gateway/openai-compat#embeddings
 * 
 * Benefits:
 * - Built-in observability in Vercel dashboard
 * - Automatic failover across providers
 * - Unified cost tracking
 * 
 * Atomic operation: text → vector
 */

import { EmbeddingError } from '../utils/errors';
import { RAG_CONFIG } from '../config';

/**
 * Get embeddings config (lazy-loaded to ensure env vars are available)
 */
function getEmbeddingsConfig() {
  const useAIGateway = !!process.env.AI_GATEWAY_API_KEY && !!process.env.VERCEL_OIDC_TOKEN;
  
  const config = {
    apiKey: useAIGateway ? process.env.AI_GATEWAY_API_KEY! : process.env.OPENAI_API_KEY!,
    baseURL: useAIGateway ? 'https://ai-gateway.vercel.sh/v1' : 'https://api.openai.com/v1',
    model: RAG_CONFIG.embeddings.model,
  };
  
  if (!config.apiKey) {
    throw new EmbeddingError('No API key found. Set OPENAI_API_KEY (local) or AI_GATEWAY_API_KEY (production)');
  }
  
  return config;
}

/**
 * Generate single embedding (for queries)
 * 
 * Uses OpenAI-compatible REST API (direct fetch call)
 * Per Vercel docs: https://vercel.com/docs/ai-gateway/openai-compat#embeddings
 * 
 * @param text - Text to embed
 * @returns 1536-dimensional vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new EmbeddingError('Cannot generate embedding for empty text');
  }
  
  const config = getEmbeddingsConfig();
  
  try {
    const response = await fetch(`${config.baseURL}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        input: text,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    const embedding = data.data[0].embedding;
    
    if (!embedding || embedding.length !== RAG_CONFIG.embeddings.dimensions) {
      throw new EmbeddingError(
        `Invalid embedding dimensions: expected ${RAG_CONFIG.embeddings.dimensions}, got ${embedding?.length || 0}`
      );
    }
    
    return embedding;
  } catch (error: any) {
    throw new EmbeddingError(`Failed to generate embedding: ${error.message}`, {
      textLength: text.length,
    });
  }
}

/**
 * Generate batch embeddings (for document ingestion)
 * 
 * Uses OpenAI-compatible REST API (direct fetch call)
 * More efficient than multiple single calls - OpenAI API handles batching internally
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
  
  const config = getEmbeddingsConfig();
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${config.baseURL}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        input: validTexts, // OpenAI API accepts array of strings for batch
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    const embeddings = data.data.map((item: any) => item.embedding);
    
    if (!embeddings || embeddings.length !== validTexts.length) {
      throw new EmbeddingError(
        `Invalid embedding count: expected ${validTexts.length}, got ${embeddings?.length || 0}`
      );
    }
    
    return embeddings;
  } catch (error: any) {
    throw new EmbeddingError(`Failed to generate batch embeddings: ${error.message}`, {
      textCount: texts.length,
    });
  }
}

