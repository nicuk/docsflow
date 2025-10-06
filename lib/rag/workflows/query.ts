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
    console.log(`[Query Workflow] Starting query: "${input.query}"`);
    console.log(`[Query Workflow] Tenant: ${input.tenantId}`);
    
    // STEP 1: Generate query embedding
    console.log('[Query Workflow] Step 1: Generating embedding');
    const embedding = await generateEmbedding(input.query);
    
    // 🎯 NEW: Detect if query mentions a specific filename
    const filenamePattern = /\b([\w\-_]+(?:\s*\(\d+\))?\.(?:png|jpg|jpeg|pdf|docx|doc|txt|xlsx|xls|pptx|ppt|csv))\b/i;
    const filenameMatch = input.query.match(filenamePattern);
    const detectedFilename = filenameMatch ? filenameMatch[1] : null;
    
    // Merge detected filename with existing filter
    let finalFilter = input.filter || {};
    if (detectedFilename) {
      console.log(`🎯 [FILENAME DETECTION] Query mentions file: "${detectedFilename}" - filtering results`);
      finalFilter = { ...finalFilter, filename: detectedFilename };
    }
    
    // STEP 2: Retrieve relevant chunks
    console.log('[Query Workflow] Step 2: Retrieving chunks');
    const chunks = await retrieveChunks({
      embedding,
      tenantId: input.tenantId,
      topK: input.topK,
      filter: finalFilter, // ✅ Now includes filename filter if detected
    });
    
    // STEP 3: Calculate confidence
    console.log('[Query Workflow] Step 3: Calculating confidence');
    const confidence = calculateConfidence(
      chunks.map(c => ({ score: c.score, content: c.content, metadata: c.metadata }))
    );
    
    console.log(`[Query Workflow] Confidence: ${confidence}% (${chunks.length} chunks)`);
    
    // STEP 4: Check if confident enough
    if (!isSufficientConfidence(confidence) || chunks.length === 0) {
      const duration = Date.now() - startTime;
      console.log(`[Query Workflow] Abstaining due to low confidence (${confidence}%)`);
      
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
    console.log('[Query Workflow] Step 4: Generating answer');
    const generation = await generateAnswer({
      query: input.query,
      context: chunks,
    });
    
    const duration = Date.now() - startTime;
    
    console.log(`[Query Workflow] ✅ Success in ${duration}ms`);
    
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
    console.error('[Query Workflow] Error:', error);
    
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

