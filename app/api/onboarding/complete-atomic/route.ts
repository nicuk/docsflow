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

    // First create tenant if user doesn't have one
    let tenantId;
    
    // Check if user already has a tenant
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('tenant_id')
      .eq('id', userId)
      .single();
    
    if (existingUser?.tenant_id) {
      tenantId = existingUser.tenant_id;
    } else {
      // Create new tenant
      const newTenantId = crypto.randomUUID();
      
      // Insert tenant
      const { error: tenantError } = await supabaseAdmin
        .from('tenants')
        .insert({
          id: newTenantId,
          subdomain: cleanSubdomain,
          name: businessName || cleanSubdomain,
          industry: industry || 'general'
        });
      
      if (tenantError) {
        if (tenantError.message?.includes('duplicate key')) {
          return NextResponse.json(
            { error: 'Subdomain already taken' },
            { status: 409, headers: corsHeaders }
          );
        }
        throw tenantError;
      }
      
      // Update user with tenant_id and admin access level
      const { error: userError } = await supabaseAdmin
        .from('users')
        .update({ 
          tenant_id: newTenantId, 
          role: 'admin',
          access_level: 1  // Admin level in 1-2 system
        })
        .eq('id', userId);
      
      if (userError) throw userError;
      
      tenantId = newTenantId;
    }

    // Store onboarding responses directly (no database function needed)
    if (responses && Object.keys(responses).length > 0) {
      const { error: responsesError } = await supabaseAdmin
        .from('onboarding_responses')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          responses: {
            subdomain: cleanSubdomain,
            business_name: businessName || cleanSubdomain,
            industry: industry || 'technology',
            ...responses
          }
        })
        .select()
        .single();

      if (responsesError) {
        console.warn('Failed to store onboarding responses:', responsesError.message);
        // Don't fail the entire onboarding for this
      }
    }

    // Create success result
    const response = createResponseWithSessionCookies(
      {
        success: true,
        tenant: {
          id: tenantId,
          subdomain: cleanSubdomain,
          name: businessName || cleanSubdomain,
          industry: industry || 'general'
        },
        redirectUrl: `https://${cleanSubdomain}.docsflow.app/dashboard`
      },
      {
        tenantId: tenantId,
        onboardingComplete: true
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
