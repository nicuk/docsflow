import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createResponseWithSessionCookies } from '@/lib/cookie-utils';
import { getCORSHeaders } from '@/lib/utils';

/**
 * Atomic onboarding completion endpoint
 * Creates tenant and updates user in a single transaction
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: getCORSHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    const { subdomain, industry, businessName, responses } = await request.json();
    
    // Validate required fields
    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Clean subdomain
    const cleanSubdomain = subdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
    
    // Get session from our centralized session endpoint
    const sessionResponse = await fetch(`${request.nextUrl.origin}/api/auth/session`, {
      headers: {
        cookie: request.headers.get('cookie') || ''
      }
    });
    
    const sessionData = await sessionResponse.json();
    
    if (!sessionData.authenticated || !sessionData.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const userId = sessionData.user.id;
    const userEmail = sessionData.user.email;

    // Initialize Supabase with service role for atomic operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Start atomic transaction using Supabase RPC
    const { data: result, error: transactionError } = await supabaseAdmin.rpc('complete_onboarding_atomic', {
      p_user_id: userId,
      p_subdomain: cleanSubdomain,
      p_business_name: businessName || cleanSubdomain,
      p_industry: industry || 'technology',
      p_responses: responses || {}
    });

    if (transactionError) {
      console.error('Transaction error:', transactionError);
      
      // Handle specific error cases
      if (transactionError.message?.includes('already exists')) {
        return NextResponse.json(
          { error: 'Subdomain already taken' },
          { status: 409, headers: corsHeaders }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to complete onboarding', details: transactionError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Create response with updated session cookies
    const response = createResponseWithSessionCookies(
      {
        success: true,
        tenant: result.tenant,
        redirectUrl: `https://${cleanSubdomain}.docsflow.app/dashboard`
      },
      {
        'tenant-id': result.tenant.id,
        'tenant-subdomain': cleanSubdomain
      }
    );

    // Add CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value as string);
    });

    return response;

  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
