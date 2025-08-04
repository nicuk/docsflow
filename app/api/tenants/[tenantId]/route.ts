import { NextRequest, NextResponse } from 'next/server';
import { redis, safeRedisOperation } from '@/lib/redis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params;

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
      console.log(`✅ Cache HIT for tenant: ${tenantId}`);
      return NextResponse.json(cachedTenant);
    }

    console.log(`❌ Cache MISS for tenant: ${tenantId} - fetching from database`);

    // Fetch from Supabase database
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      console.error('Tenant not found:', error);
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Transform database data to API format
    const tenantData: TenantData = {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      branding: {
        logoUrl: tenant.logo_url,
        primaryColor: tenant.primary_color || '#3b82f6',
        secondaryColor: tenant.secondary_color || '#1e40af',
      },
      settings: {
        maxUsers: tenant.max_users,
        features: tenant.features || [],
      },
      createdAt: tenant.created_at,
      updatedAt: tenant.updated_at,
    };

    // Cache the result for future requests
    await safeRedisOperation(
      () => redis!.setex(cacheKey, TENANT_CACHE_TTL, JSON.stringify(tenantData)),
      undefined
    );

    console.log(`💾 Cached tenant data for: ${tenantId}`);

    return NextResponse.json(tenantData);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: Handle tenant updates (invalidate cache)
export async function PUT(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params;
    const updates = await request.json();

    // Update in database
    const { data: tenant, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', tenantId)
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

    console.log(`🗑️ Invalidated cache for tenant: ${tenantId}`);

    return NextResponse.json(tenant);

  } catch (error) {
    console.error('Update API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle tenant deletion
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params;

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
      console.error('Tenant lookup error:', tenantError);
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
      console.error('Supabase deletion error:', supabaseError);
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

    console.log(`✅ Deleted tenant: ${tenant.subdomain}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Tenant deleted successfully' 
    });

  } catch (error) {
    console.error('Delete API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
