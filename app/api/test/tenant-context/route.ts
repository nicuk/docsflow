import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSubdomainData } from '@/lib/subdomains';
// SECURITY FIX: Use secure database service instead of direct service role key
import { SecureTenantService } from '@/lib/secure-database';

export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const tenantIdFromHeader = headersList.get('x-tenant-id');
    const { searchParams } = new URL(request.url);
    const testTenant = searchParams.get('tenant') || 'demo';

    // Test 1: Redis/Cache lookup
    const cachedData = await getSubdomainData(testTenant);
    
    // Test 2: Secure service lookup
    const supabaseData = await SecureTenantService.getTenantBySubdomain(testTenant);
    const error = supabaseData ? null : new Error('Tenant not found');

    // Test 3: Header propagation
    const headerTest = {
      tenant_from_header: tenantIdFromHeader,
      tenant_from_param: testTenant,
      headers_match: tenantIdFromHeader === testTenant
    };

    return NextResponse.json({
      success: true,
      tenant_context_test: {
        test_tenant: testTenant,
        redis_cache: {
          available: cachedData !== null,
          data: cachedData ? {
            subdomain: testTenant,
            organization: cachedData.displayName || 'Unknown Organization',
            subscriptionTier: cachedData.subscriptionTier || 'demo',
            created: cachedData.createdAt
          } : null
        },
        supabase_db: {
          available: !error && supabaseData !== null,
          error: error?.message,
          data: supabaseData ? {
            id: supabaseData.id,
            subdomain: supabaseData.subdomain,
            name: supabaseData.name,
            industry: supabaseData.industry,
            created: supabaseData.created_at
          } : null
        },
        header_propagation: headerTest,
        environment: {
          node_env: process.env.NODE_ENV,
          has_redis_config: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
          has_supabase_config: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
        }
      }
    });

  } catch (error) {
    console.error('Tenant context test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      tenant_context_test: null
    }, { status: 500 });
  }
}
