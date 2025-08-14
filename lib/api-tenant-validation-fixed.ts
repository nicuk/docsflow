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

    // Extract tenant subdomain from multiple sources (priority order)
    let tenantSubdomain: string | null = null;
    
    // 1. From middleware-injected header (highest priority)
    tenantSubdomain = request.headers.get('x-tenant-subdomain');
    
    // 2. From custom tenant header (fallback)
    if (!tenantSubdomain) {
      tenantSubdomain = request.headers.get('X-Tenant-Subdomain');
    }
    
    // 3. From URL path parameter (for routes like /api/tenant/[tenant]/*)
    if (!tenantSubdomain) {
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const tenantIndex = pathSegments.findIndex(segment => segment === 'tenant');
      if (tenantIndex !== -1 && pathSegments[tenantIndex + 1]) {
        tenantSubdomain = pathSegments[tenantIndex + 1];
      }
    }
    
    // 4. From query parameter (lowest priority)
    if (!tenantSubdomain) {
      const url = new URL(request.url);
      tenantSubdomain = url.searchParams.get('tenant');
    }

    // If no tenant found and fallback allowed
    if (!tenantSubdomain && fallbackTenant) {
      tenantSubdomain = fallbackTenant;
    }

    // Validate tenant subdomain exists
    if (!tenantSubdomain) {
      return {
        isValid: false,
        tenantId: null,
        tenantData: null,
        error: 'Tenant subdomain is required',
        statusCode: 400
      };
    }

    // Validate tenant exists in system and get its UUID
    let tenantData = null;
    
    // First check Redis cache
    const cachedData = await getSubdomainData(tenantSubdomain);
    if (cachedData) {
      tenantData = cachedData;
    } else {
      // Fallback to Supabase
      const { data: supabaseTenant, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('subdomain', tenantSubdomain)
        .single();

      if (error || !supabaseTenant) {
        console.error(`Tenant lookup failed for subdomain '${tenantSubdomain}':`, error);
        return {
          isValid: false,
          tenantId: null,
          tenantData: null,
          error: `Tenant '${tenantSubdomain}' not found`,
          statusCode: 404
        };
      }

      tenantData = supabaseTenant;
    }

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
