/**
 * Pinecone Storage Implementation
 * 
 * Implements VectorStorage interface for Pinecone.
 * Multi-tenant isolation via namespaces.
 */

import { Pinecone } from '@pinecone-database/pinecone';
import type {
  VectorStorage,
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
   * Query vectors by similarity
   */
  async query(input: QueryInput): Promise<QueryResult[]> {
    try {
      console.log(`[Pinecone] Querying namespace: ${input.namespace}, topK: ${input.topK}`);
      
      const response = await this.index.namespace(input.namespace).query({
        vector: input.vector,
        topK: input.topK,
        filter: input.filter,
        includeMetadata: input.includeMetadata ?? true,
      });
      
      const results: QueryResult[] = (response.matches || []).map(match => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata as any,
      }));
      
      console.log(`[Pinecone] Found ${results.length} results`);
      
      return results;
    } catch (error: any) {
      console.error('[Pinecone] Query error:', error);
      throw new StorageError(`Pinecone query failed: ${error.message}`, {
        namespace: input.namespace,
        topK: input.topK,
      });
    }
  }
  
  /**
   * Upsert vectors (insert or update)
   */
  async upsert(input: UpsertInput): Promise<UpsertResult> {
    try {
      console.log(`[Pinecone] Upserting ${input.vectors.length} vectors to namespace: ${input.namespace}`);
      
      await this.index.namespace(input.namespace).upsert(input.vectors);
      
      console.log(`[Pinecone] Successfully upserted ${input.vectors.length} vectors`);
      
      return {
        upsertedCount: input.vectors.length,
      };
    } catch (error: any) {
      console.error('[Pinecone] Upsert error:', error);
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
      console.log(`[Pinecone] Deleting from namespace: ${input.namespace}`);
      
      if (input.ids && input.ids.length > 0) {
        await this.index.namespace(input.namespace).deleteMany(input.ids);
        console.log(`[Pinecone] Deleted ${input.ids.length} vectors by ID`);
        return { deletedCount: input.ids.length };
      } else if (input.filter) {
        await this.index.namespace(input.namespace).deleteMany(input.filter);
        console.log(`[Pinecone] Deleted vectors by filter`);
        return {};
      } else {
        throw new StorageError('Delete requires either ids or filter');
      }
    } catch (error: any) {
      console.error('[Pinecone] Delete error:', error);
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
      console.error('[Pinecone] Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const storage = new PineconeStorage();

// Export convenience functions
export const queryVectors = (input: QueryInput) => storage.query(input);
export const upsertVectors = (input: UpsertInput) => storage.upsert(input);
export const deleteVectors = (input: DeleteInput) => storage.delete(input);
export const checkHealth = () => storage.healthCheck();

