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
      console.error('Error checking existing requests:', checkError);
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
      console.error('Error creating invitation request:', insertError);
      return NextResponse.json(
        { error: 'Failed to create invitation request', details: insertError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // TODO: Send notification email to tenant administrators
    // This would typically involve:
    // 1. Get tenant admin emails from users table
    // 2. Send email notification about the new request
    // 3. Include link to admin panel to approve/deny

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
    console.error('Invitation request API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
