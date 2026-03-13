/**
 * Delete Workflow
 * 
 * Atomic workflow: Document ID → Delete all vectors from Pinecone
 * 
 * Steps:
 * 1. Delete vectors by filter (documentId)
 * 2. Confirm deletion
 * 
 * Simple and focused on one task.
 */

import { deleteVectors } from '../storage/pinecone';
import { DeleteWorkflowError } from '../utils/errors';

export interface DeleteInput {
  documentId: string;
  tenantId: string;
}

export interface DeleteResult {
  success: boolean;
  documentId: string;
  metrics: {
    duration: number;
  };
}

/**
 * Execute delete workflow
 * 
 * Deletes all vectors for a specific document from Pinecone.
 */
export async function deleteWorkflow(input: DeleteInput): Promise<DeleteResult> {
  const startTime = Date.now();
  
  try {
    // Delete all chunks for this document using metadata filter
    await deleteVectors({
      filter: {
        documentId: input.documentId,
      },
      namespace: input.tenantId, // Multi-tenant isolation ✅
    });
    
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      documentId: input.documentId,
      metrics: {
        duration,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    throw new DeleteWorkflowError(
      `Delete workflow failed: ${error.message}`,
      {
        documentId: input.documentId,
        tenantId: input.tenantId,
        duration,
      }
    );
  }
}

