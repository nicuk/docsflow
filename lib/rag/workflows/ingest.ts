/**
 * Ingest Workflow
 * 
 * Atomic workflow: Document chunks → Vectors in Pinecone
 * 
 * Steps:
 * 1. Validate chunks
 * 2. Generate embeddings in batch
 * 3. Upsert vectors to Pinecone with metadata
 * 
 * Each step is independently testable and debuggable.
 */

import { generateEmbeddings } from '../core/embeddings';
import { upsertVectors } from '../storage/pinecone';
import type { Vector } from '../storage/interface';
import { IngestWorkflowError, ValidationError } from '../utils/errors';

export interface ChunkInput {
  content: string;
  metadata: {
    filename?: string;
    chunkIndex?: number;
    pageNumber?: number;
    [key: string]: any;
  };
}

export interface IngestInput {
  documentId: string;
  tenantId: string;
  chunks: ChunkInput[];
}

export interface IngestResult {
  success: boolean;
  chunksProcessed: number;
  vectorsUpserted: number;
  metrics: {
    duration: number;
    avgEmbeddingTime: number;
  };
}

/**
 * Validate chunk inputs
 */
function validateChunks(chunks: ChunkInput[]): void {
  if (!chunks || chunks.length === 0) {
    throw new ValidationError('Chunks array cannot be empty');
  }
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    if (!chunk.content || chunk.content.trim().length === 0) {
      throw new ValidationError(`Chunk ${i} has empty content`);
    }
    
    if (chunk.content.length > 10000) {
      // Chunk is very long, but still valid
    }
  }
}

/**
 * Execute ingest workflow
 * 
 * This is the main entry point for ingesting documents into the RAG system.
 */
export async function ingestWorkflow(input: IngestInput): Promise<IngestResult> {
  const startTime = Date.now();
  
  try {
    // STEP 1: Validate chunks
    validateChunks(input.chunks);
    
    // STEP 2: Generate embeddings (batch processing)
    const embeddings = await generateEmbeddings(
      input.chunks.map(c => c.content)
    );
    
    // STEP 3: Prepare vectors with metadata
    const vectors: Vector[] = input.chunks.map((chunk, index) => ({
      id: `${input.documentId}_chunk_${index}`,
      values: embeddings[index],
      metadata: {
        documentId: input.documentId,
        tenantId: input.tenantId,
        content: chunk.content,
        filename: chunk.metadata.filename || 'Unknown',
        chunkIndex: chunk.metadata.chunkIndex ?? index,
        pageNumber: chunk.metadata.pageNumber,
        ...chunk.metadata,
      },
    }));
    
    // STEP 4: Upsert to Pinecone (with tenant namespace)
    const result = await upsertVectors({
      vectors,
      namespace: input.tenantId, // Multi-tenant isolation ✅
    });
    
    const duration = Date.now() - startTime;
    const avgEmbeddingTime = duration / input.chunks.length;
    
    return {
      success: true,
      chunksProcessed: input.chunks.length,
      vectorsUpserted: result.upsertedCount,
      metrics: {
        duration,
        avgEmbeddingTime,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    throw new IngestWorkflowError(
      `Ingest workflow failed: ${error.message}`,
      {
        documentId: input.documentId,
        tenantId: input.tenantId,
        chunkCount: input.chunks.length,
        duration,
      }
    );
  }
}

