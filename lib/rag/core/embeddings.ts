/**
 * Embeddings Generation
 * 
 * Uses OpenRouter to access OpenAI text-embedding-3-small model.
 * Atomic operation: text → vector
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import { EmbeddingError } from '../utils/errors';
import { RAG_CONFIG } from '../config';

// Initialize embeddings model (lazy-loaded singleton)
let embeddingsInstance: OpenAIEmbeddings | null = null;

function getEmbeddings(): OpenAIEmbeddings {
  if (!embeddingsInstance) {
    embeddingsInstance = new OpenAIEmbeddings({
      openAIApiKey: RAG_CONFIG.openrouter.apiKey,
      modelName: RAG_CONFIG.embeddings.model,
      dimensions: RAG_CONFIG.embeddings.dimensions,
      configuration: {
        baseURL: RAG_CONFIG.openrouter.baseURL,
      },
    });
  }
  return embeddingsInstance;
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
    const embeddings = getEmbeddings();
    const result = await embeddings.embedQuery(text);
    
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
    const embeddings = getEmbeddings();
    const results = await embeddings.embedDocuments(validTexts);
    
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

