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
 * 
 * Priority:
 * 1. Vercel AI Gateway (production - more reliable)
 * 2. Direct OpenAI (local dev)
 */
function getEmbeddingsConfig() {
  // Use AI Gateway if key is available (don't require OIDC token - it's auto-injected)
  const hasAIGatewayKey = !!process.env.AI_GATEWAY_API_KEY;
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  
  // Always prefer AI Gateway in production (more reliable than direct OpenAI)
  const useAIGateway = hasAIGatewayKey;
  
  const config = {
    apiKey: useAIGateway ? process.env.AI_GATEWAY_API_KEY! : process.env.OPENAI_API_KEY!,
    baseURL: useAIGateway ? 'https://ai-gateway.vercel.sh/v1' : 'https://api.openai.com/v1',
    model: RAG_CONFIG.embeddings.model,
  };
  
  if (!config.apiKey) {
    throw new EmbeddingError(
      `No API key found. Available: AI_GATEWAY=${hasAIGatewayKey}, OPENAI=${hasOpenAIKey}`
    );
  }
  
  console.log(`[Embeddings Config] Using ${useAIGateway ? 'AI Gateway' : 'Direct OpenAI'} (${config.baseURL})`);
  
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
    console.log(`[Embeddings] Generating single embedding (${text.length} chars) via ${config.baseURL}`);
    
    // Add 30s timeout to prevent hanging
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    let response;
    try {
      response = await fetch(`${config.baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          input: text,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }
    } catch (fetchError: any) {
      clearTimeout(timeout);
      if (fetchError.name === 'AbortError') {
        throw new EmbeddingError('Embeddings API timeout (30s)', { text: text.substring(0, 100) });
      }
      console.error(`[Embeddings] Fetch error:`, fetchError);
      throw new EmbeddingError(`Network error: ${fetchError.message}`, { 
        baseURL: config.baseURL,
        error: fetchError.message 
      });
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
    console.error('[Embeddings] Error:', error);
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
    console.log(`[Embeddings] Generating batch embeddings for ${validTexts.length} texts via ${config.baseURL}`);
    const startTime = Date.now();
    
    // Add 60s timeout for batch operations (more texts = longer processing)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    
    let response;
    try {
      response = await fetch(`${config.baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          input: validTexts, // OpenAI API accepts array of strings for batch
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Embeddings] Batch API error (${response.status}): ${errorText}`);
        throw new Error(`Batch embeddings API error (${response.status}): ${errorText}`);
      }
    } catch (fetchError: any) {
      clearTimeout(timeout);
      if (fetchError.name === 'AbortError') {
        console.error(`[Embeddings] Batch timeout after 60s`);
        throw new EmbeddingError('Batch embeddings API timeout (60s)', { count: validTexts.length });
      }
      console.error(`[Embeddings] Batch fetch error:`, fetchError);
      throw new EmbeddingError(`Network error during batch embeddings: ${fetchError.message}`, { 
        baseURL: config.baseURL,
        count: validTexts.length,
        error: fetchError.message 
      });
    }
    
    const data = await response.json();
    const embeddings = data.data.map((item: any) => item.embedding);
    
    const duration = Date.now() - startTime;
    console.log(`[Embeddings] Batch complete: ${embeddings.length} embeddings in ${duration}ms (avg: ${Math.round(duration / embeddings.length)}ms per embedding)`);
    
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

