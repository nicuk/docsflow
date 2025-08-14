/**
 * Document Access Control System
 * Provides real organizational value through role-based access
 */

export type DocumentClassification = 'public' | 'private' | 'shared' | 'restricted';

export type UserRole = 'guest' | 'employee' | 'team_lead' | 'manager' | 'admin';

export interface DocumentAccessPolicy {
  classification: DocumentClassification;
  departments?: string[];      // Specific departments that can access
  userIds?: string[];          // Specific users with explicit access
  expiresAt?: Date;           // Auto-revoke access after date
  requiresMFA?: boolean;      // Extra security for sensitive docs
}

/**
 * Access matrix: minimum level required for each classification
 */
const ACCESS_MATRIX: Record<DocumentClassification, number> = {
  'public': 1,        // Everyone including guests
  'private': 2,       // Document owner and above
  'shared': 3,        // Team leads and above
  'restricted': 4     // Managers and above
};

/**
 * Check if user can access document based on their level
 */
export function canAccessDocument(
  userLevel: number,
  docClassification: DocumentClassification,
  userDepartment?: string,
  userId?: string,
  policy?: DocumentAccessPolicy
): boolean {
  // Check expiry first
  if (policy?.expiresAt && new Date() > policy.expiresAt) {
    return false;
  }

  // Check explicit user access
  if (policy?.userIds?.includes(userId || '')) {
    return true;
  }

  // Check department access
  if (policy?.departments && userDepartment) {
    if (!policy.departments.includes(userDepartment)) {
      return false;
    }
  }

  // Check level-based access
  return userLevel >= ACCESS_MATRIX[docClassification];
}

/**
 * Get allowed classifications for upload based on user level
 */
export function getAllowedUploadClassifications(userLevel: number): DocumentClassification[] {
  const allowed: DocumentClassification[] = [];
  
  // Users can upload documents at their level or below
  for (const [classification, requiredLevel] of Object.entries(ACCESS_MATRIX)) {
    if (userLevel >= requiredLevel) {
      allowed.push(classification as DocumentClassification);
    }
  }
  
  return allowed;
}

/**
 * Smart classification suggestion based on document content
 */
export function suggestClassification(
  filename: string,
  content: string,
  mimeType: string
): DocumentClassification {
  const lowerContent = content.toLowerCase();
  const lowerFilename = filename.toLowerCase();
  
  // Restricted indicators (highest sensitivity)
  if (
    lowerContent.includes('confidential') ||
    lowerContent.includes('secret') ||
    lowerContent.includes('restricted') ||
    lowerContent.includes('sensitive') ||
    lowerFilename.includes('contract') ||
    lowerFilename.includes('legal') ||
    lowerFilename.includes('financial') ||
    lowerFilename.includes('hr') ||
    lowerFilename.includes('salary') ||
    lowerFilename.includes('performance')
  ) {
    return 'restricted';
  }
  
  // Private indicators (personal/owner only)
  if (
    lowerContent.includes('private') ||
    lowerContent.includes('personal') ||
    lowerFilename.includes('draft') ||
    lowerFilename.includes('temp') ||
    lowerFilename.includes('wip')
  ) {
    return 'private';
  }
  
  // Public indicators
  if (
    lowerFilename.includes('public') ||
    lowerFilename.includes('marketing') ||
    lowerFilename.includes('blog') ||
    lowerFilename.includes('press') ||
    lowerFilename.includes('announcement')
  ) {
    return 'public';
  }
  
  // Default to shared for general documents
  return 'shared';
}

/**
 * Generate audit log entry for document access
 */
export function logDocumentAccess(
  userId: string,
  documentId: string,
  action: 'view' | 'download' | 'edit' | 'delete',
  granted: boolean,
  reason?: string
): void {
  // In production, this would write to an audit log table
  console.log('[AUDIT]', {
    timestamp: new Date().toISOString(),
    userId,
    documentId,
    action,
    granted,
    reason
  });
}

/**
 * Bulk permission update for multiple documents
 */
export async function bulkUpdatePermissions(
  documentIds: string[],
  newClassification: DocumentClassification,
  supabase: any
): Promise<{ success: boolean; updated: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;
  
  for (const docId of documentIds) {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ access_level: newClassification })
        .eq('id', docId);
      
      if (error) {
        errors.push(`Failed to update ${docId}: ${error.message}`);
      } else {
        updated++;
      }
    } catch (err) {
      errors.push(`Error updating ${docId}: ${err}`);
    }
  }
  
  return {
    success: errors.length === 0,
    updated,
    errors
  };
}
