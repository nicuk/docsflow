import { NextRequest, NextResponse } from 'next/server';
import { getSubdomainData } from '@/lib/subdomains';
import { createClient } from '@supabase/supabase-js';

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

    // Extract tenant from multiple sources (priority order)
    let tenantId: string | null = null;
    
    // 1. From middleware-injected header (highest priority)
    tenantId = request.headers.get('x-tenant-id');
    
    // 2. From custom tenant header
    if (!tenantId) {
      tenantId = request.headers.get('X-Tenant-Subdomain');
    }
    
    // 3. From URL path parameter (for routes like /api/tenant/[tenant]/*)
    if (!tenantId) {
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const tenantIndex = pathSegments.findIndex(segment => segment === 'tenant');
      if (tenantIndex !== -1 && pathSegments[tenantIndex + 1]) {
        tenantId = pathSegments[tenantIndex + 1];
      }
    }
    
    // 4. From query parameter (lowest priority)
    if (!tenantId) {
      const url = new URL(request.url);
      tenantId = url.searchParams.get('tenant');
    }

    // Enterprise mode - no demo fallback

    // If no tenant found and fallback allowed
    if (!tenantId && fallbackTenant) {
      tenantId = fallbackTenant;
    }

    // Validate tenant ID exists
    if (!tenantId) {
      return {
        isValid: false,
        tenantId: null,
        tenantData: null,
        error: 'Tenant ID is required',
        statusCode: 400
      };
    }

    // Validate tenant exists in system
    let tenantData = null;
    
    // First check Redis cache
    const cachedData = await getSubdomainData(tenantId);
    if (cachedData) {
      tenantData = cachedData;
    } else {
      // Fallback to Supabase
      const { data: supabaseTenant, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('subdomain', tenantId)
        .single();

      if (error || !supabaseTenant) {
        return {
          isValid: false,
          tenantId,
          tenantData: null,
          error: `Tenant '${tenantId}' not found`,
          statusCode: 404
        };
      }

      tenantData = supabaseTenant;
    }

    // Additional auth validation if required
    if (requireAuth) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          isValid: false,
          tenantId,
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
            tenantId,
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

        if (userTenantAccess?.tenant_id !== tenantData.id) {
          return {
            isValid: false,
            tenantId,
            tenantData,
            error: 'Access denied to this tenant',
            statusCode: 403
          };
        }
      } catch (authValidationError) {
        return {
          isValid: false,
          tenantId,
          tenantData,
          error: 'Authentication validation failed',
          statusCode: 401
        };
      }
    }

    return {
      isValid: true,
      tenantId,
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
  handler: (request: NextRequest, context: { params: any }, tenantContext: TenantValidationResult) => Promise<NextResponse>,
  options: TenantValidationOptions = {}
) {
  return async (request: NextRequest, context: { params: any }) => {
    const tenantValidation = await validateTenantContext(request, options);
    
    if (!tenantValidation.isValid) {
      return NextResponse.json(
        { 
          error: tenantValidation.error,
          tenant_validation_failed: true 
        },
        { status: tenantValidation.statusCode || 400 }
      );
    }

    // Add tenant context to request headers for downstream use
    const requestWithTenant = new Request(request, {
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        'x-validated-tenant-id': tenantValidation.tenantId!,
        'x-tenant-data': JSON.stringify(tenantValidation.tenantData)
      }
    });

    return handler(requestWithTenant as NextRequest, context, tenantValidation);
  };
}

/**
 * Helper to extract validated tenant data from request headers
 */
export function getValidatedTenantFromRequest(request: NextRequest): TenantValidationResult | null {
  const tenantId = request.headers.get('x-validated-tenant-id');
  const tenantDataHeader = request.headers.get('x-tenant-data');
  
  if (!tenantId || !tenantDataHeader) {
    return null;
  }

  try {
    const tenantData = JSON.parse(tenantDataHeader);
    return {
      isValid: true,
      tenantId,
      tenantData
    };
  } catch (error) {
    return null;
  }
}
