/**
 * Query Workflow
 * 
 * Atomic workflow: User query → Answer with sources
 * 
 * Steps:
 * 1. Generate query embedding
 * 2. Retrieve relevant chunks
 * 3. Generate answer from context
 * 4. Calculate confidence
 * 
 * Each step is independently testable and debuggable.
 */

import { generateEmbedding } from '../core/embeddings';
import { generateSparseVector, boostKeywords } from '../core/sparse-vectors';
import { retrieveChunks, type RetrievedChunk } from '../core/retrieval';
import { generateAnswer } from '../core/generation';
import { calculateConfidence, isSufficientConfidence } from '../utils/confidence';
import { QueryWorkflowError } from '../utils/errors';

export interface QueryInput {
  query: string;
  tenantId: string;
  userId?: string;
  topK?: number;
  filter?: Record<string, any>;
}

export interface QueryResult {
  success: boolean;
  answer?: string;
  sources?: Array<{
    documentId: string;
    filename: string;
    content: string;
    score: number;
    pageNumber?: number;
  }>;
  confidence: number;
  abstained?: boolean;
  reason?: string;
  metrics: {
    duration: number;
    chunksRetrieved: number;
    model: string;
    tokensUsed?: number;
  };
}

/**
 * Execute query workflow
 * 
 * This is the main entry point for querying the RAG system.
 */
export async function queryWorkflow(input: QueryInput): Promise<QueryResult> {
  const startTime = Date.now();
  
  try {
    // STEP 1: Generate dense + sparse vectors (HYBRID SEARCH)
    const embedding = await generateEmbedding(input.query);
    
    // Generate sparse vector for keyword matching
    let sparseVector = generateSparseVector(input.query);
    
    // Detect if query mentions a specific filename
    const filenamePattern = /\b([\w\-_]+(?:\s*\(\d+\))?\.(?:png|jpg|jpeg|pdf|docx|doc|txt|xlsx|xls|pptx|ppt|csv))\b/i;
    const filenameMatch = input.query.match(filenamePattern);
    const detectedFilename = filenameMatch ? filenameMatch[1] : null;
    
    // Boost filename terms in sparse vector for better matching
    if (detectedFilename) {
      sparseVector = boostKeywords(sparseVector, [detectedFilename], 3.0);
    }
    
    // Merge detected filename with existing filter (fallback)
    let finalFilter = input.filter;
    if (detectedFilename) {
      finalFilter = { ...(input.filter || {}), filename: detectedFilename };
    }
    
    // Convert empty filter to undefined (Pinecone rejects empty objects)
    if (finalFilter && Object.keys(finalFilter).length === 0) {
      finalFilter = undefined;
    }
    
    // STEP 2: Retrieve relevant chunks with HIERARCHICAL + HYBRID SEARCH (Phase 1B)
    
    // Use hierarchical retrieval (2-stage: document-level → chunk-level)
    const { hierarchicalRetrieve } = await import('../core/hierarchical-retrieval');
    const chunks = await hierarchicalRetrieve({
      query: input.query,
      tenantId: input.tenantId,
      topK: input.topK || 5,
      topDocs: 10, // Search within top 10 relevant documents (from 100)
      filter: finalFilter, // undefined or object with keys
      minScore: detectedFilename ? 0.1 : 0.25, // Lower threshold for filename queries
    });
    
    // STEP 3: Calculate confidence
    const confidence = calculateConfidence(
      chunks.map(c => ({ score: c.score, content: c.content, metadata: c.metadata }))
    );
    
    // STEP 4: Check if confident enough
    if (!isSufficientConfidence(confidence) || chunks.length === 0) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        abstained: true,
        reason: chunks.length === 0 
          ? 'No relevant documents found'
          : `Confidence too low (${confidence}%)`,
        confidence,
        metrics: {
          duration,
          chunksRetrieved: chunks.length,
          model: 'N/A',
        },
      };
    }
    
    // STEP 5: Generate answer
    const generation = await generateAnswer({
      query: input.query,
      context: chunks,
    });
    
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      answer: generation.answer,
      sources: chunks.map(chunk => ({
        documentId: chunk.metadata.documentId,
        filename: chunk.metadata.filename,
        content: chunk.content,
        score: chunk.score,
        pageNumber: chunk.metadata.pageNumber,
      })),
      confidence,
      metrics: {
        duration,
        chunksRetrieved: chunks.length,
        model: generation.model,
        tokensUsed: generation.tokensUsed,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    throw new QueryWorkflowError(
      `Query workflow failed: ${error.message}`,
      {
        query: input.query,
        tenantId: input.tenantId,
        duration,
      }
    );
  }
}

