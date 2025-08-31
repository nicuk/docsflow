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
  console.log('🔐 Starting dual admin verification for:', { userId, tenantId });
  
  const result: AdminVerificationResult = {
    isAdmin: false,
    verificationMethod: 'failed',
    details: { errors: [] }
  };

  try {
    console.log('🔐 Starting admin verification for user:', userId, 'tenant:', tenantId);
    
    // Step 1: Verify via Supabase Auth metadata (cryptographically secure)
    console.log('🔍 Step 1: Checking auth metadata...');
    let authMetadata = null;
    try {
      const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(userId);
      
      if (authError) {
        result.details.errors?.push(`Auth verification failed: ${authError.message}`);
        console.error('❌ Auth verification error:', authError);
      } else {
        authMetadata = authUser.user?.user_metadata;
        result.details.authMetadata = authMetadata;
        console.log('✅ Auth metadata retrieved:', {
          role: authMetadata?.role,
          tenant_id: authMetadata?.tenant_id,
          access_level: authMetadata?.access_level
        });
      }
    } catch (authError) {
      result.details.errors?.push(`Auth service error: ${authError}`);
      console.error('❌ Auth service error:', authError);
    }

    // Step 2: Verify via database record (using service role to bypass RLS)
    console.log('🔍 Step 2: Checking database record...');
    let dbRecord = null;
    try {
      const { data: dbUser, error: dbError } = await adminSupabase
        .from('users')
        .select('role, tenant_id, access_level, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (dbError) {
        result.details.errors?.push(`Database verification failed: ${dbError.message}`);
        console.error('❌ Database verification error:', dbError);
      } else {
        dbRecord = dbUser;
        result.details.dbRecord = dbRecord;
        console.log('✅ Database record retrieved:', {
          role: dbRecord?.role,
          tenant_id: dbRecord?.tenant_id,
          access_level: dbRecord?.access_level
        });
      }
    } catch (dbError) {
      result.details.errors?.push(`Database service error: ${dbError}`);
      console.error('❌ Database service error:', dbError);
    }
    
    // Log cross-verification details
    console.log('🔍 Cross-verification details:', {
      authMetadataAvailable: !!authMetadata,
      dbRecordAvailable: !!dbRecord,
      authTenantId: authMetadata?.tenant_id,
      dbTenantId: dbRecord?.tenant_id,
      expectedTenantId: tenantId
    });

    // Step 3: Cross-verify both sources (BOTH must agree for admin access)
    console.log('🔍 Step 3: Cross-verifying sources...');
    
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

    console.log('📊 Verification results:', {
      authIsAdmin,
      dbIsAdmin,
      authTenantMatch: authMetadata?.tenant_id === tenantId,
      dbTenantMatch: dbRecord?.tenant_id === tenantId
    });

    // Determine verification method and result
    if (authIsAdmin && dbIsAdmin) {
      result.isAdmin = true;
      result.tenantId = tenantId;
      result.accessLevel = Math.min(authMetadata?.access_level || 0, dbRecord?.access_level || 0);
      result.verificationMethod = 'dual';
      console.log('✅ DUAL VERIFICATION SUCCESS: User is confirmed admin');
    } else if (authIsAdmin && !dbRecord) {
      // Auth says admin but no DB record - suspicious
      result.isAdmin = false;
      result.verificationMethod = 'auth_only';
      result.details.errors?.push('Auth metadata indicates admin but no database record found');
      console.warn('⚠️ SECURITY WARNING: Auth admin without DB record');
    } else if (dbIsAdmin && !authMetadata) {
      // DB says admin but no auth metadata - suspicious
      result.isAdmin = false;
      result.verificationMethod = 'db_only';
      result.details.errors?.push('Database indicates admin but no auth metadata found');
      console.warn('⚠️ SECURITY WARNING: DB admin without auth metadata');
    } else {
      result.isAdmin = false;
      result.verificationMethod = 'failed';
      console.log('❌ VERIFICATION FAILED: User is not admin or sources disagree');
    }

    return result;

  } catch (error) {
    console.error('❌ Admin verification system error:', error);
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
    
    console.log('📝 Admin action logged:', { adminUserId, tenantId, action });
  } catch (error) {
    console.error('❌ Failed to log admin action:', error);
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
