import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCORSHeaders } from '@/lib/utils';

/**
 * Access Request API
 * Allows users to request access to a tenant organization
 */

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    const { 
      tenantSubdomain, 
      userEmail, 
      userName, 
      requestedRole = 'user', 
      requestedAccessLevel = 3, 
      requestReason 
    } = await request.json();

    // Validate required fields
    if (!tenantSubdomain || !userEmail || !userName) {
      return NextResponse.json(
        { error: 'tenantSubdomain, userEmail, and userName are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get tenant ID from subdomain
    const { data: tenant, error: tenantError } = await supabase!
      .from('tenants')
      .select('id, name, subdomain')
      .eq('subdomain', tenantSubdomain)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get user IP and user agent for security tracking
    const userIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Use the database function to submit access request
    const { data: result, error: submitError } = await supabase!
      .rpc('submit_access_request', {
        p_tenant_id: tenant.id,
        p_user_email: userEmail,
        p_user_name: userName,
        p_requested_role: requestedRole,
        p_requested_access_level: requestedAccessLevel,
        p_request_reason: requestReason,
        p_user_ip: userIP,
        p_user_agent: userAgent
      });

    if (submitError) {
      return NextResponse.json(
        { error: 'Failed to submit access request' },
        { status: 500, headers: corsHeaders }
      );
    }

    const requestResult = result[0];

    if (requestResult.status === 'already_member') {
      return NextResponse.json({
        success: false,
        status: 'already_member',
        message: requestResult.message,
        redirectUrl: `https://${tenant.subdomain}.docsflow.app/login`
      }, { 
        status: 409, 
        headers: corsHeaders 
      });
    }

    if (requestResult.status === 'pending') {
      return NextResponse.json({
        success: true,
        status: 'pending',
        message: requestResult.message,
        requestId: requestResult.request_id
      }, { headers: corsHeaders });
    }

    return NextResponse.json({
      success: true,
      status: 'submitted',
      message: requestResult.message,
      requestId: requestResult.request_id,
      tenant: {
        name: tenant.name,
        subdomain: tenant.subdomain
      }
    }, { headers: corsHeaders });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
