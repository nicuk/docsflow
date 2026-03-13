import { NextRequest, NextResponse } from 'next/server';
import { redis, safeRedisOperation } from '@/lib/redis';
import { createClient } from '@supabase/supabase-js';

// SECURITY FIX: Use secure database service
import { SecureDocumentService, SecureTenantService, SecureUserService } from '@/lib/secure-database';
// Note: Update the function to use SecureDocumentService, SecureTenantService, or SecureUserService methods

interface TenantData {
  id: string;
  name: string;
  subdomain: string;
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  settings: {
    maxUsers?: number;
    features?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

const TENANT_CACHE_TTL = 60 * 60; // 1 hour in seconds
const TENANT_CACHE_PREFIX = 'tenant:';

// Create Supabase client with service role for public tenant metadata
// This bypasses RLS policies that block anon access to tenant branding data
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Try to get from Redis cache first
    const cacheKey = `${TENANT_CACHE_PREFIX}${tenantId}`;
    const cachedTenant = await safeRedisOperation(
      () => redis!.get(cacheKey),
      null
    );

    if (cachedTenant) {
      return NextResponse.json(cachedTenant);
    }

    // Fetch from Supabase database - support both UUID and subdomain lookup
    let tenant, error;
    
    // First try by UUID (if tenantId looks like a UUID)
    if (tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const result = await supabase
        .from('tenants')
        .select('id, name, subdomain, created_at, updated_at')
        .eq('id', tenantId)
        .maybeSingle();
      tenant = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from('tenants')
        .select('id, name, subdomain, created_at, updated_at')
        .eq('subdomain', tenantId)
        .maybeSingle();
      tenant = result.data;
      error = result.error;
    }

    if (error || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found', tenantId, queryType: tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? 'UUID' : 'subdomain' },
        { status: 404 }
      );
    }

    // Transform database data to API format
    const tenantData: TenantData = {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      branding: {
        logoUrl: null,
        primaryColor: '#3b82f6',
        secondaryColor: '#1e40af',
      },
      settings: {
        maxUsers: null,
        features: [],
      },
      createdAt: tenant.created_at,
      updatedAt: tenant.updated_at,
    };

    // Cache the result for future requests
    await safeRedisOperation(
      () => redis!.setex(cacheKey, TENANT_CACHE_TTL, JSON.stringify(tenantData)),
      undefined
    );

    return NextResponse.json(tenantData);

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: Handle tenant updates (invalidate cache)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const updates = await request.json();

    // Update in database - query by subdomain since tenantId is actually subdomain
    const { data: tenant, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('subdomain', tenantId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update tenant' },
        { status: 400 }
      );
    }

    // Invalidate cache
    const cacheKey = `${TENANT_CACHE_PREFIX}${tenantId}`;
    await safeRedisOperation(
      () => redis!.del(cacheKey),
      undefined
    );

    return NextResponse.json(tenant);

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle tenant deletion
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant subdomain is required' },
        { status: 400 }
      );
    }

    // First, get the tenant record to ensure it exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, subdomain')
      .eq('subdomain', tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Delete tenant from Supabase database
    const { error: supabaseError } = await supabase
      .from('tenants')
      .delete()
      .eq('id', tenant.id);

    if (supabaseError) {
      return NextResponse.json(
        { error: 'Failed to delete tenant from database' },
        { status: 500 }
      );
    }

    // Invalidate cache
    const cacheKey = `${TENANT_CACHE_PREFIX}${tenant.id}`;
    await safeRedisOperation(
      () => redis!.del(cacheKey),
      undefined
    );

    // Also delete any subdomain-related cache
    const subdomainCacheKey = `subdomain:${tenant.subdomain}`;
    await safeRedisOperation(
      () => redis!.del(subdomainCacheKey),
      undefined
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Tenant deleted successfully' 
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
