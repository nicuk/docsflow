/**
 * Embeddings Generation - Pure OpenRouter API
 * 
 * Direct OpenRouter API calls (no LangChain wrapper).
 * LangChain's OpenAIEmbeddings doesn't work properly with OpenRouter's baseURL.
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
 * Call OpenRouter embeddings API directly
 */
async function callOpenRouterEmbeddings(input: string | string[]): Promise<number[][]> {
  const response = await fetch(`${RAG_CONFIG.openrouter.baseURL}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RAG_CONFIG.openrouter.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.VERCEL_URL || 'http://localhost:3000',
      'X-Title': 'DocsFlow RAG',
    },
    body: JSON.stringify({
      model: RAG_CONFIG.embeddings.model,
      input: input,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
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
    const results = await callOpenRouterEmbeddings(text);
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
    const results = await callOpenRouterEmbeddings(validTexts);
    
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

