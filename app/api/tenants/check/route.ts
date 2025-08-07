import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getCORSHeaders } from '@/lib/utils';

// Initialize Supabase client
function getSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing');
  }
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        get() { return undefined },
        set() {},
        remove() {},
      },
    }
  );
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: getCORSHeaders(origin) });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get('subdomain');

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain parameter is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    // Check if tenant with this subdomain already exists
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, subdomain, name')
      .eq('subdomain', subdomain)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Database error checking subdomain:', error);
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    const exists = !!tenant;

    return NextResponse.json({
      exists,
      subdomain,
      tenant: exists ? {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain
      } : null,
      message: exists 
        ? `Subdomain '${subdomain}' is already taken by ${tenant.name}` 
        : `Subdomain '${subdomain}' is available`
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Tenant check API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
