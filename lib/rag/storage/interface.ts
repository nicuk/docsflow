/**
 * Storage Interface
 * 
 * Defines the contract for vector storage implementations.
 * Allows swapping Pinecone for other vector DBs (Qdrant, Weaviate, etc.) later.
 */

export interface VectorMetadata {
  documentId: string;
  tenantId: string;
  filename: string;
  content: string;
  chunkIndex: number;
  pageNumber?: number;
  [key: string]: any;
}

export interface Vector {
  id: string;
  values: number[];
  metadata: VectorMetadata;
}

export interface QueryInput {
  vector: number[];
  namespace: string;
  topK: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
}

export interface QueryResult {
  id: string;
  score: number;
  metadata: VectorMetadata;
}

export interface UpsertInput {
  vectors: Vector[];
  namespace: string;
}

export interface UpsertResult {
  upsertedCount: number;
}

export interface DeleteInput {
  ids?: string[];
  filter?: Record<string, any>;
  namespace: string;
}

export interface DeleteResult {
  deletedCount?: number;
}

/**
 * Vector Storage Interface
 * 
 * Implement this interface to create alternative storage backends.
 */
export interface VectorStorage {
  /**
   * Query vectors by similarity
   */
  query(input: QueryInput): Promise<QueryResult[]>;
  
  /**
   * Upsert vectors (insert or update)
   */
  upsert(input: UpsertInput): Promise<UpsertResult>;
  
  /**
   * Delete vectors
   */
  delete(input: DeleteInput): Promise<DeleteResult>;
  
  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}

