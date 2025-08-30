import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://docsflow.app',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    // Get email from query params
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialize Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Check user record
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        tenant_id,
        role,
        access_level,
        created_at,
        updated_at
      `)
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { 
          error: 'User not found',
          details: userError?.message 
        },
        { status: 404, headers: corsHeaders }
      );
    }

    // 2. Check tenant association
    let tenant = null;
    if (user.tenant_id) {
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', user.tenant_id)
        .single();
      
      tenant = tenantData;
    }

    // 3. Check if sculptai tenant exists
    const { data: sculptaiTenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', 'sculptai')
      .single();

    // 4. Check if bitto tenant exists
    const { data: bittoTenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', 'bitto')
      .single();

    // 5. Get all tenants to see what's available
    const { data: allTenants } = await supabase
      .from('tenants')
      .select('id, subdomain, name, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      diagnostic: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tenant_id: user.tenant_id,
          role: user.role,
          access_level: user.access_level,
          created_at: user.created_at,
          updated_at: user.updated_at
        },
        currentTenant: tenant,
        sculptaiTenant: sculptaiTenant || 'NOT FOUND',
        bittoTenant: bittoTenant || 'NOT FOUND',
        allTenants: allTenants || [],
        analysis: {
          userHasTenant: !!user.tenant_id,
          userTenantSubdomain: tenant?.subdomain || 'NONE',
          shouldBeTenant: 'sculptai',
          actualTenant: tenant?.subdomain || 'NONE',
          isCorrect: tenant?.subdomain === 'sculptai'
        }
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Tenant check error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
