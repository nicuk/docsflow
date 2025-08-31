import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateTenantContext } from '@/lib/api-tenant-validation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // SECURITY FIX: Use anon key for debug
);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 TENANT DEBUG - Starting analysis...');
    
    // 1. Check what headers we're receiving
    const headers = {
      'x-tenant-id': request.headers.get('x-tenant-id'),
      'x-tenant-subdomain': request.headers.get('x-tenant-subdomain'),
      'host': request.headers.get('host'),
      'origin': request.headers.get('origin')
    };
    
    console.log('📋 Headers received:', headers);
    
    // 2. Check cookies
    const cookies = {
      'tenant-id': request.cookies.get('tenant-id')?.value,
      'access_token': request.cookies.get('access_token')?.value,
      'user_email': request.cookies.get('user_email')?.value
    };
    
    console.log('🍪 Cookies received:', cookies);
    
    // 3. Test tenant validation function
    let validationResult;
    try {
      validationResult = await validateTenantContext(request, { requireAuth: false }); // Test endpoint
      console.log('✅ Validation result:', validationResult);
    } catch (validationError) {
      console.error('❌ Validation error:', validationError);
      validationResult = { error: validationError.message };
    }
    
    // 4. Direct database lookup by subdomain
    let dbLookupBySubdomain = null;
    if (headers['x-tenant-subdomain']) {
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('subdomain', headers['x-tenant-subdomain'])
          .maybeSingle();
        
        dbLookupBySubdomain = { data, error };
        console.log(`🔍 DB lookup by subdomain "${headers['x-tenant-subdomain']}":`, dbLookupBySubdomain);
      } catch (dbError) {
        dbLookupBySubdomain = { error: dbError.message };
      }
    }
    
    // 5. Direct database lookup by UUID
    let dbLookupByUUID = null;
    if (headers['x-tenant-id']) {
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', headers['x-tenant-id'])
          .maybeSingle();
        
        dbLookupByUUID = { data, error };
        console.log(`🔍 DB lookup by UUID "${headers['x-tenant-id']}":`, dbLookupByUUID);
      } catch (dbError) {
        dbLookupByUUID = { error: dbError.message };
      }
    }
    
    // 6. Check if we're getting the UUID where we expect subdomain
    const isUUIDPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const analysis = {
      'x-tenant-id_is_uuid': headers['x-tenant-id'] ? isUUIDPattern.test(headers['x-tenant-id']) : false,
      'x-tenant-subdomain_is_uuid': headers['x-tenant-subdomain'] ? isUUIDPattern.test(headers['x-tenant-subdomain']) : false,
      'cookie_tenant-id_is_uuid': cookies['tenant-id'] ? isUUIDPattern.test(cookies['tenant-id']) : false
    };
    
    console.log('🧪 UUID Analysis:', analysis);
    
    // 7. List all tenants for reference
    const { data: allTenants } = await supabase
      .from('tenants')
      .select('id, subdomain, name')
      .limit(10);
    
    console.log('📊 Available tenants:', allTenants);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      headers,
      cookies,
      validationResult,
      dbLookupBySubdomain,
      dbLookupByUUID,
      analysis,
      allTenants,
      message: 'Tenant debug analysis complete'
    }, { status: 200 });
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return NextResponse.json({
      error: 'Debug failed',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
