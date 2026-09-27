import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCORSHeaders } from '@/lib/utils';
import { requireMember } from '@/lib/server-auth';

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCORSHeaders(request.headers.get('origin'))
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    // The persona steers every answer in the tenant, so only its admin may
    // change it. The tenant is the caller's own; a tenantId in the body is
    // accepted only when it matches.
    const { tenantId: requestedTenantId, customPersona } = await request.json();
    const check = await requireMember({ admin: true, tenantId: requestedTenantId ?? null, headers: corsHeaders });
    if (check instanceof NextResponse) return check;
    const tenantId = check.tenantId;

    if (!customPersona) {
      return NextResponse.json(
        { error: 'Custom persona data is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update tenant's custom persona
    const { data, error } = await supabase
      .from('tenants')
      .update({ 
        custom_persona: customPersona,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenantId)
      .select('id, name, custom_persona')
      .single();

    if (error) {
      throw new Error('Failed to update persona in database');
    }

    return NextResponse.json({
      success: true,
      tenant: data
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Persona update failed:', error);
    return NextResponse.json(
      { error: 'Failed to update persona' },
      { status: 500, headers: corsHeaders }
    );
  }
}

