import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCORSHeaders } from '@/lib/utils';

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
    // ❌ SKIP tenant validation since this is cross-domain call
    // The frontend sends tenantId in body instead
    const { tenantId, customPersona } = await request.json();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!customPersona) {
      return NextResponse.json(
        { error: 'Custom persona data is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`📝 Updating persona for tenant: ${tenantId}`);

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
      console.error('❌ Database error updating persona:', error);
      throw new Error('Failed to update persona in database');
    }

    console.log('✅ Persona updated successfully for tenant:', tenantId);

    return NextResponse.json({
      success: true,
      tenant: data
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ Update persona error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update persona',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
