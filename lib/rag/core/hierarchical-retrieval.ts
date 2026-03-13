/**
 * Hierarchical Retrieval Module
 * Phase 1B: Two-stage document retrieval
 * 
 * Purpose: Scale retrieval from 5 docs to 100+ docs efficiently
 * 
 * Strategy:
 * Stage 1: Find top N relevant DOCUMENTS using summaries
 * Stage 2: Find top K relevant CHUNKS within those documents
 * 
 * This 10-100x improvement in precision/recall at scale.
 */

import { generateEmbedding } from './embeddings';
import { queryVectors } from '../storage/pinecone';
import { createClient } from '@supabase/supabase-js';
import type { RetrievedChunk } from './retrieval';

export interface HierarchicalRetrievalInput {
  query: string;
  tenantId: string;
  topK?: number; // How many chunks to return
  topDocs?: number; // How many documents to search in
  filter?: Record<string, any>;
  minScore?: number;
}

const HIERARCHICAL_THRESHOLD = 20;

/**
 * Two-stage hierarchical retrieval
 * 
 * For small collections (< 20 docs): direct Pinecone query (fast path)
 * For large collections (20+ docs): two-stage document→chunk retrieval
 */
export async function hierarchicalRetrieve(
  input: HierarchicalRetrievalInput
): Promise<RetrievedChunk[]> {
  const { query, tenantId, topK = 5, topDocs = 10, filter, minScore = 0.25 } = input;
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Count tenant documents to decide strategy
  const { count: docCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('processing_status', 'completed');
  
  // Fast path: small collections go straight to Pinecone (no per-doc embedding calls)
  if (!docCount || docCount < HIERARCHICAL_THRESHOLD) {
    return directPineconeRetrieval(input);
  }
  
  // ==================== STAGE 1: Document-Level Search (20+ docs) ====================
  
  const { data: documents, error } = await supabase
    .from('documents')
    .select('id, filename, summary')
    .eq('tenant_id', tenantId)
    .not('summary', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (error || !documents || documents.length === 0) {
    return directPineconeRetrieval(input);
  }
  
  const queryEmbedding = await generateEmbedding(query);
  
  // Batch all summaries in a single embedding call instead of N separate calls
  const { generateEmbeddings } = await import('./embeddings');
  const summaryTexts = documents.map(d => d.summary || d.filename);
  
  let summaryEmbeddings: number[][];
  try {
    summaryEmbeddings = await generateEmbeddings(summaryTexts);
  } catch {
    return directPineconeRetrieval(input);
  }
  
  const docScores = documents.map((doc, i) => ({
    documentId: doc.id,
    filename: doc.filename,
    similarity: cosineSimilarity(queryEmbedding, summaryEmbeddings[i]),
  }));
  
  const topDocuments = docScores
    .filter(d => d.similarity > 0.1)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topDocs);
  
  if (topDocuments.length === 0) {
    topDocuments.push(
      ...docScores.sort((a, b) => b.similarity - a.similarity).slice(0, topDocs)
    );
  }
  
  // ==================== STAGE 2: Chunk-Level Search ====================
  
  const documentIds = topDocuments.map(d => d.documentId);
  
  const { generateSparseVector } = await import('./sparse-vectors');
  const querySparseVector = generateSparseVector(query);
  
  const results = await queryVectors({
    vector: queryEmbedding,
    sparseVector: querySparseVector,
    namespace: tenantId,
    topK: topK * 3,
    filter: {
      ...filter,
      documentId: { $in: documentIds },
    },
  });
  
  return mapAndFilterResults(results, minScore, topK);
}

/**
 * Direct Pinecone retrieval -- single embedding + single Pinecone query.
 * Used for small collections where hierarchical overhead isn't worth it.
 */
async function directPineconeRetrieval(
  input: HierarchicalRetrievalInput
): Promise<RetrievedChunk[]> {
  const { query, tenantId, topK = 5, filter, minScore = 0.25 } = input;
  
  const queryEmbedding = await generateEmbedding(query);
  
  const { generateSparseVector } = await import('./sparse-vectors');
  const querySparseVector = generateSparseVector(query);
  
  const results = await queryVectors({
    vector: queryEmbedding,
    sparseVector: querySparseVector,
    namespace: tenantId,
    topK: topK * 3,
    filter: filter && Object.keys(filter).length > 0 ? filter : undefined,
  });
  
  return mapAndFilterResults(results, minScore, topK);
}

/**
 * Shared result mapping for both retrieval paths
 */
function mapAndFilterResults(
  results: any[],
  minScore: number,
  topK: number,
): RetrievedChunk[] {
  if (!results || results.length === 0) return [];
  
  return results
    .map(result => ({
      id: result.id,
      content: result.metadata?.text as string || '',
      score: result.score || 0,
      metadata: {
        documentId: (result.metadata?.documentId || result.metadata?.document_id) as string,
        filename: result.metadata?.filename as string,
        page: result.metadata?.page as number,
        chunkIndex: (result.metadata?.chunkIndex ?? result.metadata?.chunk_index ?? 0) as number,
        tenantId: (result.metadata?.tenantId || result.metadata?.tenant_id) as string,
      },
    }))
    .filter(chunk => chunk.content && chunk.score >= minScore)
    .slice(0, topK);
}

/**
 * Cosine similarity between two vectors
 * Formula: dot(a, b) / (norm(a) * norm(b))
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  
  return dotProduct / denominator;
}

