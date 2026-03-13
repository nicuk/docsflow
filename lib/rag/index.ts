/**
 * RAG Module - Public API
 * 
 * This is the ONLY file that should be imported by application code.
 * All implementation details are hidden behind this clean interface.
 * 
 * Usage:
 * ```typescript
 * import { queryWorkflow, ingestWorkflow, deleteWorkflow } from '@/lib/rag';
 * 
 * // Query documents
 * const result = await queryWorkflow({
 *   query: "what is in test doc",
 *   tenantId: "tenant-123",
 * });
 * 
 * // Ingest document
 * await ingestWorkflow({
 *   documentId: "doc-123",
 *   tenantId: "tenant-123",
 *   chunks: [{ content: "...", metadata: {} }],
 * });
 * 
 * // Delete document
 * await deleteWorkflow({
 *   documentId: "doc-123",
 *   tenantId: "tenant-123",
 * });
 * ```
 */

// Export workflows (high-level operations)
export {
  queryWorkflow,
  type QueryInput,
  type QueryResult,
} from './workflows/query';

export {
  ingestWorkflow,
  type IngestInput,
  type IngestResult,
  type ChunkInput,
} from './workflows/ingest';

export {
  deleteWorkflow,
  type DeleteInput,
  type DeleteResult,
} from './workflows/delete';

// Export configuration
export { RAG_CONFIG, validateConfig } from './config';
import { validateConfig as _validateConfig } from './config';

// Export errors (for error handling)
export {
  RAGError,
  QueryWorkflowError,
  IngestWorkflowError,
  DeleteWorkflowError,
  EmbeddingError,
  RetrievalError,
  GenerationError,
  StorageError,
  ValidationError,
} from './utils/errors';

// Export health check
export { checkHealth } from './storage/pinecone';

// DO NOT export internal modules
// (embeddings, retrieval, generation, storage implementation are private)

/**
 * Initialize RAG module
 * 
 * Validates configuration and ensures all required environment variables are set.
 * Call this once at application startup.
 */
export function initializeRAG() {
  try {
    _validateConfig();
  } catch (error: any) {
    throw error;
  }
}

