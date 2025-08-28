import { NextRequest, NextResponse } from 'next/server';
import { getSubdomainData } from '@/lib/subdomains';
import { createClient } from '@supabase/supabase-js';
import { TenantContextManager } from './tenant-context-manager';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface TenantValidationResult {
  isValid: boolean;
  tenantId: string | null;
  tenantData: any | null;
  error?: string;
  statusCode?: number;
}

export interface TenantValidationOptions {
  requireAuth?: boolean;
  fallbackTenant?: string;
  skipValidation?: boolean;
}

/**
 * Comprehensive tenant validation for API routes
 * Extracts and validates tenant context from multiple sources with security checks
 */
export async function validateTenantContext(
  request: NextRequest,
  options: TenantValidationOptions = {}
): Promise<TenantValidationResult> {
  const {
    requireAuth = false,
    fallbackTenant = null,
    skipValidation = false
  } = options;

  try {
    // Skip validation for certain routes (health checks, etc.)
    if (skipValidation) {
      return {
        isValid: true,
        tenantId: 'system',
        tenantData: null
      };
    }

    // Get tenant subdomain and ID from headers
    const tenantSubdomain = request.headers.get('x-tenant-subdomain');
    const tenantId = request.headers.get('x-tenant-id');
    
    // CRITICAL FIX: No fallback hostname extraction to prevent "www" being treated as tenant
    if (!tenantSubdomain) {
      console.log('🔍 No tenant subdomain in headers - main domain request');
      return {
        isValid: false,
        tenantId: null,
        tenantData: null,
        error: 'No tenant context - main domain request',
        statusCode: 400
      };
    }
  
    console.log('🔍 Tenant validation:', {
      subdomain: tenantSubdomain,
      tenantId,
      requireAuth,
      headers: {
        'x-tenant-subdomain': request.headers.get('x-tenant-subdomain'),
        'x-tenant-id': request.headers.get('x-tenant-id')
      }
    });

    if (!tenantSubdomain || tenantSubdomain === 'localhost' || tenantSubdomain === 'docsflow') {
      console.error('❌ Invalid tenant subdomain:', tenantSubdomain);
      return {
        isValid: false,
        tenantId: null,
        tenantData: null,
        error: 'Invalid tenant',
        statusCode: 400
      };
    }

    // HIGH-PERFORMANCE: Use TenantContextManager with multi-layer caching
    const tenantInfo = await TenantContextManager.resolveTenant(tenantSubdomain);
  
    if (!tenantInfo) {
      console.error('❌ Tenant lookup failed for subdomain:', tenantSubdomain);
      return {
        isValid: false,
        tenantId: null,
        tenantData: null,
        error: 'Tenant not found',
        statusCode: 404
      };
    }
  
    // Convert TenantInfo to full tenant object for backward compatibility
    const tenantData = {
      id: tenantInfo.uuid,
      subdomain: tenantInfo.subdomain,
      name: tenantInfo.name,
      created_at: new Date().toISOString() // We don't have createdAt in TenantData interface
    };

    // At this point, tenantData must have an 'id' field which is the UUID
    const tenantUUID = tenantData?.id;
    
    if (!tenantUUID) {
      console.error('Tenant data missing UUID:', tenantData);
      return {
        isValid: false,
        tenantId: null,
        tenantData,
        error: 'Tenant UUID not found',
        statusCode: 500
      };
    }

    // Additional auth validation if required
    if (requireAuth) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          isValid: false,
          tenantId: tenantUUID,  // Always use UUID
          tenantData,
          error: 'Authentication required',
          statusCode: 401
        };
      }

      // Validate auth token
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
          return {
            isValid: false,
            tenantId: tenantUUID,  // Always use UUID
            tenantData,
            error: 'Invalid authentication token',
            statusCode: 401
          };
        }

        // Check if user has access to this tenant
        const { data: userTenantAccess } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('id', user.id)
          .single();

        if (userTenantAccess?.tenant_id !== tenantUUID) {
          return {
            isValid: false,
            tenantId: tenantUUID,  // Always use UUID
            tenantData,
            error: 'Access denied to this tenant',
            statusCode: 403
          };
        }
      } catch (authValidationError) {
        return {
          isValid: false,
          tenantId: tenantUUID,  // Always use UUID
          tenantData,
          error: 'Authentication validation failed',
          statusCode: 401
        };
      }
    }

    // SUCCESS: Return the UUID, not the subdomain
    return {
      isValid: true,
      tenantId: tenantUUID,  // CRITICAL: Always return UUID, never subdomain
      tenantData
    };

  } catch (error) {
    console.error('Tenant validation error:', error);
    return {
      isValid: false,
      tenantId: null,
      tenantData: null,
      error: 'Internal server error during tenant validation',
      statusCode: 500
    };
  }
}

/**
 * Middleware wrapper for API routes that require tenant validation
 */
export function withTenantValidation(
  handler: (req: NextRequest, context: TenantValidationResult) => Promise<NextResponse>,
  options: TenantValidationOptions = {}
) {
  return async (req: NextRequest) => {
    const validation = await validateTenantContext(req, options);
    
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.statusCode || 400 }
      );
    }
    
    return handler(req, validation);
  };
}
