import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCORSHeaders } from '@/lib/utils';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: getCORSHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    const body = await request.json();
    const { subdomain, userEmail, companyName, message, requestType } = body;

    // Validate required fields
    if (!subdomain || !userEmail || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: subdomain, userEmail, and message are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Configuration error' },
        { status: 500, headers: corsHeaders }
      );
    }

    // First, verify the tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, subdomain')
      .eq('subdomain', subdomain)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if there's already a pending request from this email for this tenant
    const { data: existingRequest, error: checkError } = await supabase
      .from('invitation_requests')
      .select('id, status')
      .eq('tenant_id', tenant.id)
      .eq('email', userEmail)
      .in('status', ['pending', 'approved'])
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      return NextResponse.json(
        { error: 'Database error checking existing requests' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (existingRequest) {
      const statusMessage = existingRequest.status === 'approved' 
        ? 'You already have approved access to this organization'
        : 'You already have a pending request for this organization';
      
      return NextResponse.json(
        { error: statusMessage },
        { status: 409, headers: corsHeaders }
      );
    }

    // Create the invitation request
    const { data: invitationRequest, error: insertError } = await supabase
      .from('invitation_requests')
      .insert({
        tenant_id: tenant.id,
        email: userEmail,
        company_name: companyName || null,
        message: message,
        request_type: requestType || 'join_existing',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create invitation request', details: insertError.message },
        { status: 500, headers: corsHeaders }
      );
    }


    return NextResponse.json({
      success: true,
      message: 'Invitation request sent successfully',
      request: {
        id: invitationRequest.id,
        tenant: {
          name: tenant.name,
          subdomain: tenant.subdomain
        },
        status: 'pending'
      }
    }, { headers: corsHeaders });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
