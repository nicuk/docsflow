import { NextRequest, NextResponse } from 'next/server';
import { redis, safeRedisOperation } from '@/lib/redis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // First, get the tenant ID from subdomain
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
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

    // Delete from Redis cache
    const cacheKey = `tenant:${tenant.id}`;
    await safeRedisOperation(
      () => redis!.del(cacheKey),
      undefined
    );

    // Also delete any subdomain-related cache
    const subdomainCacheKey = `subdomain:${tenantId}`;
    await safeRedisOperation(
      () => redis!.del(subdomainCacheKey),
      undefined
    );

    console.log(`✅ Deleted tenant: ${tenantId}`);

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
