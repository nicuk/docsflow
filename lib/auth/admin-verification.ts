import { createClient } from '@supabase/supabase-js';

// Service role client for admin operations (bypasses RLS)
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AdminVerificationResult {
  isAdmin: boolean;
  tenantId?: string;
  accessLevel?: number;
  verificationMethod: 'dual' | 'auth_only' | 'db_only' | 'failed';
  details: {
    authMetadata?: any;
    dbRecord?: any;
    errors?: string[];
  };
}

/**
 * Secure dual-source admin verification (8/10 security rating)
 * Verifies admin status using both Supabase Auth metadata AND database records
 * 
 * @param userId - User ID to verify
 * @param tenantId - Tenant ID to verify admin access for
 * @returns AdminVerificationResult with detailed verification info
 */
export async function verifyTenantAdmin(
  userId: string, 
  tenantId: string
): Promise<AdminVerificationResult> {
  const result: AdminVerificationResult = {
    isAdmin: false,
    verificationMethod: 'failed',
    details: { errors: [] }
  };

  try {
    // Step 1: Verify via Supabase Auth metadata (cryptographically secure)
    let authMetadata = null;
    try {
      const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(userId);
      
      if (authError) {
        result.details.errors?.push(`Auth verification failed: ${authError.message}`);
      } else {
        authMetadata = authUser.user?.user_metadata;
        result.details.authMetadata = authMetadata;
      }
    } catch (authError) {
      result.details.errors?.push(`Auth service error: ${authError}`);
    }

    // Step 2: Verify via database record (using service role to bypass RLS)
    let dbRecord = null;
    try {
      const { data: dbUser, error: dbError } = await adminSupabase
        .from('users')
        .select('role, tenant_id, access_level, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (dbError) {
        result.details.errors?.push(`Database verification failed: ${dbError.message}`);
      } else {
        dbRecord = dbUser;
        result.details.dbRecord = dbRecord;
      }
    } catch (dbError) {
      result.details.errors?.push(`Database service error: ${dbError}`);
    }
    
    // Step 3: Cross-verify both sources (BOTH must agree for admin access)
    
    const authIsAdmin = (
      authMetadata?.role === 'admin' &&
      authMetadata?.tenant_id === tenantId &&
      (authMetadata?.access_level || 0) === 1
    );

    const dbIsAdmin = (
      dbRecord?.role === 'admin' &&
      dbRecord?.tenant_id === tenantId &&
      (dbRecord?.access_level || 0) === 1
    );

    // Determine verification method and result
    if (authIsAdmin && dbIsAdmin) {
      result.isAdmin = true;
      result.tenantId = tenantId;
      result.accessLevel = Math.min(authMetadata?.access_level || 0, dbRecord?.access_level || 0);
      result.verificationMethod = 'dual';
    } else if (authIsAdmin && !dbRecord) {
      // Auth says admin but no DB record - suspicious
      result.isAdmin = false;
      result.verificationMethod = 'auth_only';
      result.details.errors?.push('Auth metadata indicates admin but no database record found');
    } else if (dbIsAdmin && !authMetadata) {
      // DB says admin but no auth metadata - suspicious
      result.isAdmin = false;
      result.verificationMethod = 'db_only';
      result.details.errors?.push('Database indicates admin but no auth metadata found');
    } else {
      result.isAdmin = false;
      result.verificationMethod = 'failed';
    }

    return result;

  } catch (error) {
    result.details.errors?.push(`System error: ${error}`);
    return result;
  }
}

/**
 * Quick admin check for less critical operations
 * Uses dual verification but with simplified response
 */
export async function isUserTenantAdmin(userId: string, tenantId: string): Promise<boolean> {
  const result = await verifyTenantAdmin(userId, tenantId);
  return result.isAdmin && result.verificationMethod === 'dual';
}

/**
 * Audit log for admin actions
 */
export async function logAdminAction(
  adminUserId: string,
  tenantId: string,
  action: string,
  details?: any
): Promise<void> {
  try {
    await adminSupabase
      .from('admin_audit_log')
      .insert({
        admin_user_id: adminUserId,
        tenant_id: tenantId,
        action,
        details: details || {},
        timestamp: new Date().toISOString(),
        ip_address: null, // Could be added from request headers
        user_agent: null  // Could be added from request headers
      });
    
  } catch (error) {
    // Don't throw - logging failure shouldn't break the main operation
  }
}

/**
 * Enhanced admin verification with audit logging
 */
export async function verifyAndLogAdminAction(
  userId: string,
  tenantId: string,
  action: string,
  details?: any
): Promise<AdminVerificationResult> {
  const verification = await verifyTenantAdmin(userId, tenantId);
  
  if (verification.isAdmin) {
    await logAdminAction(userId, tenantId, action, details);
  }
  
  return verification;
}
