/**
 * Embeddings Generation - Direct OpenAI API
 * 
 * NOTE: OpenRouter doesn't support embeddings endpoint!
 * We use OpenAI directly for embeddings (cheap: $0.00002 per 1K tokens).
 * OpenRouter is only used for LLM completions (expensive models).
 * 
 * Atomic operation: text → vector
 */

import { EmbeddingError } from '../utils/errors';
import { RAG_CONFIG } from '../config';

interface OpenRouterEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Call OpenAI embeddings API directly
 * 
 * OpenRouter doesn't support /embeddings endpoint, only /chat/completions.
 * So we call OpenAI directly for embeddings (they're cheap anyway).
 */
async function callOpenAIEmbeddings(input: string | string[]): Promise<number[][]> {
  // Use OpenAI directly (not OpenRouter) for embeddings
  const openaiApiKey = process.env.OPENAI_API_KEY || RAG_CONFIG.openrouter.apiKey;
  
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small', // OpenAI model name (no "openai/" prefix)
      input: input,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Embeddings] OpenAI API error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText.substring(0, 500),
    });
    throw new Error(`OpenAI API error (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const data: OpenRouterEmbeddingResponse = await response.json();
  
  // Extract embeddings in order
  return data.data
    .sort((a, b) => a.index - b.index)
    .map(item => item.embedding);
}

/**
 * Generate single embedding (for queries)
 * 
 * @param text - Text to embed
 * @returns 1536-dimensional vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new EmbeddingError('Cannot generate embedding for empty text');
  }
  
  try {
    const results = await callOpenAIEmbeddings(text);
    const result = results[0];
    
    if (!result || result.length !== RAG_CONFIG.embeddings.dimensions) {
      throw new EmbeddingError(
        `Invalid embedding dimensions: expected ${RAG_CONFIG.embeddings.dimensions}, got ${result?.length || 0}`
      );
    }
    
    return result;
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
    const results = await callOpenAIEmbeddings(validTexts);
    
    if (!results || results.length !== validTexts.length) {
      throw new EmbeddingError(
        `Invalid embedding count: expected ${validTexts.length}, got ${results?.length || 0}`
      );
    }
    
    return results;
  } catch (error: any) {
    console.error('[Embeddings] Batch error:', error);
    throw new EmbeddingError(`Failed to generate batch embeddings: ${error.message}`, {
      textCount: texts.length,
    });
  }
}

