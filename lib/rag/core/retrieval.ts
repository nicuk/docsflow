/**
 * Retrieval Operations
 * 
 * HYBRID SEARCH: Combines semantic (dense) + keyword (sparse) search
 * Atomic operation: (dense vector + sparse vector) → relevant chunks
 */

import { queryVectors } from '../storage/pinecone';
import { RetrievalError } from '../utils/errors';
import { RAG_CONFIG } from '../config';
import type { SparseVector } from '../storage/interface';

export interface RetrievedChunk {
  id: string;
  content: string;
  score: number;
  metadata: {
    documentId: string;
    filename: string;
    chunkIndex: number;
    pageNumber?: number;
    tenantId: string;
    [key: string]: any;
  };
}

/**
 * Retrieve relevant chunks using HYBRID SEARCH
 * 
 * @param embedding - Query embedding vector (dense)
 * @param sparseVector - Query sparse vector (keywords) - OPTIONAL for hybrid search
 * @param tenantId - Tenant ID for namespace isolation
 * @param topK - Number of results to return (default: 5)
 * @param filter - Optional metadata filter
 * @param alpha - Balance between dense (0) and sparse (1) search - default 0.5
 * @returns Array of relevant chunks with scores
 */
export async function retrieveChunks(input: {
  embedding: number[];
  sparseVector?: SparseVector; // HYBRID SEARCH support
  tenantId: string;
  topK?: number;
  filter?: Record<string, any>;
  minScore?: number; // ✅ Allow custom threshold
  alpha?: number; // Balance between dense and sparse (default 0.5)
}): Promise<RetrievedChunk[]> {
  const { embedding, sparseVector, tenantId, topK = RAG_CONFIG.retrieval.topK, filter, minScore, alpha } = input;
  
  if (!embedding || embedding.length !== RAG_CONFIG.embeddings.dimensions) {
    throw new RetrievalError(
      `Invalid embedding dimensions: expected ${RAG_CONFIG.embeddings.dimensions}, got ${embedding?.length || 0}`
    );
  }
  
  if (!tenantId) {
    throw new RetrievalError('Tenant ID is required for retrieval');
  }
  
  try {
    const searchType = sparseVector ? 'HYBRID' : 'DENSE';
    console.log(`[Retrieval] ${searchType} searching tenant: ${tenantId}, topK: ${topK}`);
    
    const results = await queryVectors({
      vector: embedding,
      sparseVector, // HYBRID SEARCH: Add sparse vector if provided
      namespace: tenantId, // Multi-tenant isolation ✅
      topK,
      filter,
      includeMetadata: true,
      alpha, // Balance between dense and sparse
    });
    
    // Transform to our interface
    const chunks: RetrievedChunk[] = results.map(result => ({
      id: result.id,
      // Pinecone stores text in metadata.text (not metadata.content)
      content: result.metadata.text || result.metadata.content || '',
      score: result.score,
      metadata: {
        documentId: result.metadata.documentId,
        filename: result.metadata.filename || 'Unknown',
        chunkIndex: result.metadata.chunkIndex || 0,
        pageNumber: result.metadata.pageNumber,
        tenantId: result.metadata.tenantId,
        text: result.metadata.text, // Keep for reference
        ...result.metadata,
      },
    }));
    
    // Log actual scores for debugging
    console.log(`[Retrieval] Top 5 scores:`, chunks.slice(0, 5).map(c => ({ 
      score: c.score.toFixed(4), 
      filename: c.metadata.filename,
      text: (c.content || c.metadata.text || '').substring(0, 50)
    })));
    
    // Filter by minimum score (use custom threshold if provided)
    const effectiveMinScore = minScore ?? RAG_CONFIG.retrieval.minScore;
    const filtered = chunks.filter(chunk => chunk.score >= effectiveMinScore);
    
    console.log(`[Retrieval] Found ${chunks.length} results, ${filtered.length} above threshold (minScore: ${effectiveMinScore})`);
    
    return filtered;
  } catch (error: any) {
    console.error('[Retrieval] Error:', error);
    throw new RetrievalError(`Failed to retrieve chunks: ${error.message}`, {
      tenantId,
      topK,
    });
  }
}

