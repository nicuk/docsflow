/**
 * Pinecone Storage Implementation
 * 
 * Implements VectorStorage interface for Pinecone.
 * Multi-tenant isolation via namespaces.
 */

import { Pinecone } from '@pinecone-database/pinecone';
import type {
  VectorStorage,
  VectorMetadata,
  QueryInput,
  QueryResult,
  UpsertInput,
  UpsertResult,
  DeleteInput,
  DeleteResult,
} from './interface';
import { StorageError } from '../utils/errors';
import { RAG_CONFIG } from '../config';

// Initialize Pinecone (singleton)
let pineconeInstance: Pinecone | null = null;

function getPinecone(): Pinecone {
  if (!pineconeInstance) {
    pineconeInstance = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pineconeInstance;
}

/**
 * Pinecone Storage Implementation
 */
class PineconeStorage implements VectorStorage {
  private index;
  
  constructor() {
    const pinecone = getPinecone();
    this.index = pinecone.Index(RAG_CONFIG.pinecone.index);
  }
  
  /**
   * Query vectors by similarity (HYBRID SEARCH)
   */
  async query(input: QueryInput): Promise<QueryResult[]> {
    try {
      // Build query params
      const queryParams: any = {
        vector: input.vector,
        topK: input.topK,
        filter: input.filter,
        includeMetadata: input.includeMetadata ?? true,
      };
      
      // Add sparse vector for hybrid search
      if (input.sparseVector && input.sparseVector.indices.length > 0) {
        queryParams.sparseVector = input.sparseVector;
      }
      
      const response = await this.index.namespace(input.namespace).query(queryParams);
      
      const results: QueryResult[] = (response.matches || []).map(match => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata as unknown as VectorMetadata,
      }));
      
      return results;
    } catch (error: any) {
      throw new StorageError(`Pinecone query failed: ${error.message}`, {
        namespace: input.namespace,
        topK: input.topK,
      });
    }
  }
  
  /**
   * Upsert vectors (insert or update) - HYBRID SEARCH SUPPORT
   */
  async upsert(input: UpsertInput): Promise<UpsertResult> {
    try {
      await this.index.namespace(input.namespace).upsert(input.vectors);
      
      return {
        upsertedCount: input.vectors.length,
      };
    } catch (error: any) {
      throw new StorageError(`Pinecone upsert failed: ${error.message}`, {
        namespace: input.namespace,
        vectorCount: input.vectors.length,
      });
    }
  }
  
  /**
   * Delete vectors
   */
  async delete(input: DeleteInput): Promise<DeleteResult> {
    try {
      if (input.ids && input.ids.length > 0) {
        await this.index.namespace(input.namespace).deleteMany(input.ids);
        return { deletedCount: input.ids.length };
      } else if (input.filter) {
        await this.index.namespace(input.namespace).deleteMany(input.filter);
        return {};
      } else {
        throw new StorageError('Delete requires either ids or filter');
      }
    } catch (error: any) {
      throw new StorageError(`Pinecone delete failed: ${error.message}`, {
        namespace: input.namespace,
      });
    }
  }
  
  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.index.describeIndexStats();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Lazy-loaded singleton instance (waits for env vars to be loaded)
let storageInstance: PineconeStorage | null = null;

function getStorage(): PineconeStorage {
  if (!storageInstance) {
    storageInstance = new PineconeStorage();
  }
  return storageInstance;
}

// Export singleton instance (lazy-loaded via Proxy)
export const storage = new Proxy({} as PineconeStorage, {
  get(_target, prop: string | symbol) {
    return (getStorage() as unknown as Record<string | symbol, unknown>)[prop];
  }
});

// Export convenience functions
export const queryVectors = (input: QueryInput) => getStorage().query(input);
export const upsertVectors = (input: UpsertInput) => getStorage().upsert(input);
export const deleteVectors = (input: DeleteInput) => getStorage().delete(input);
export const checkHealth = () => getStorage().healthCheck();

