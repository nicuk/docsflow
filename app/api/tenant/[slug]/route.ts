
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCORSHeaders } from '@/lib/utils';

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    const supabase = createServerClient();
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', params.slug)
      .single();

    if (error) {
      console.error('Tenant fetch error:', error);
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json(tenant, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Tenant API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

