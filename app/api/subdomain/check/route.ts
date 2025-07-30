import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCORSHeaders } from '@/lib/utils';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: getCORSHeaders(origin) });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get('subdomain')?.toLowerCase().trim();

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain parameter is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    if (subdomain.length < 3 || subdomain.length > 63) {
      return NextResponse.json(
        { 
          available: false, 
          error: 'Subdomain must be between 3 and 63 characters long' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!subdomainRegex.test(subdomain)) {
      return NextResponse.json(
        { 
          available: false, 
          error: 'Subdomain can only contain lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen.' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check for reserved subdomains
    const reservedSubdomains = [
      'www', 'api', 'admin', 'root', 'mail', 'ftp', 'localhost', 'test',
      'staging', 'dev', 'development', 'prod', 'production', 'beta',
      'alpha', 'demo', 'docs', 'support', 'help', 'blog', 'news',
      'status', 'monitor', 'app', 'apps', 'cdn', 'static', 'assets'
    ];

    if (reservedSubdomains.includes(subdomain)) {
      return NextResponse.json(
        { 
          available: false, 
          error: 'This subdomain is reserved and cannot be used' 
        },
        { status: 200, headers: corsHeaders }
      );
    }

    const supabase = createServerClient();

    // Check if subdomain already exists with detailed info
    const { data: existingTenant, error } = await supabase
      .from('tenants')
      .select(`
        id, 
        subdomain, 
        name,
        industry,
        created_at,
        custom_persona
      `)
      .eq('subdomain', subdomain)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is what we want
      console.error('Database error checking subdomain:', error);
      return NextResponse.json(
        { error: 'Failed to check subdomain availability' },
        { status: 500, headers: corsHeaders }
      );
    }

    const isAvailable = !existingTenant;

    if (isAvailable) {
      return NextResponse.json(
        { 
          available: true,
          subdomain: subdomain,
          message: 'Subdomain is available'
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // If tenant exists, check for user email in URL params and look for invitation
    const userEmail = searchParams.get('email');
    let hasInvitation = false;
    let invitationToken = null;

    if (userEmail && existingTenant) {
      // Check for pending invitation
      const { data: invitation } = await supabase
        .from('user_invitations')
        .select('token, status, expires_at')
        .eq('tenant_id', existingTenant.id)
        .eq('email', userEmail)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (invitation) {
        hasInvitation = true;
        invitationToken = invitation.token;
      }
    }

    // Get user count for this tenant
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', existingTenant.id);

    return NextResponse.json(
      { 
        available: false,
        subdomain: subdomain,
        message: 'Subdomain is already taken',
        existingTenant: {
          id: existingTenant.id,
          name: existingTenant.name || `${subdomain} Organization`,
          industry: existingTenant.industry || 'general',
          userCount: userCount || 1,
          createdAt: existingTenant.created_at
        },
        hasInvitation,
        invitationToken
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Subdomain check API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
