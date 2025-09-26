/**
 * SIMPLIFIED ENTERPRISE LOGIN API
 * 
 * Replaces complex login route with enterprise-grade simplicity
 * Preserves multi-tenant functionality, removes over-engineering
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getCORSHeaders } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    const { email, password, rememberMe } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create Supabase client with enterprise cookie configuration
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Enterprise multi-tenant cookie configuration
              const enhancedOptions = {
                ...options,
                domain: process.env.NODE_ENV === 'production' ? '.docsflow.app' : undefined,
                path: '/',
                sameSite: 'lax' as const,
                // Remember me affects cookie duration
                maxAge: rememberMe ? (60 * 60 * 24 * 30) : (60 * 60 * 24 * 7) // 30 days vs 7 days
              };
              cookieStore.set(name, value, enhancedOptions);
            });
          },
        },
      }
    );

    // Standard Supabase authentication
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('🔐 [LOGIN-UNIFIED] Authentication failed:', authError.message);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401, headers: corsHeaders }
      );
    }

    if (!authData.session) {
      return NextResponse.json(
        { success: false, error: 'No session created' },
        { status: 500, headers: corsHeaders }
      );
    }

    // 🎯 CRITICAL FIX: Establish auth context for RLS policies BEFORE querying users table
    // Without this, auth.uid() returns NULL and RLS policy blocks the query
    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token
    });
    
    if (setSessionError) {
      console.error('🔐 [LOGIN] Failed to set session context:', setSessionError.message);
      return NextResponse.json(
        { success: false, error: 'Authentication context error' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    console.log('✅ [LOGIN] Auth context established - auth.uid() now available for RLS');

    // Fetch user profile with tenant information
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        access_level,
        tenant_id,
        tenants (
          id,
          subdomain,
          name,
          industry
        )
      `)
      .eq('id', authData.user.id)
      .maybeSingle(); // SURGICAL FIX: Handle missing tenant relationships gracefully

    if (profileError || !userProfile) {
      console.error('🔐 [LOGIN-UNIFIED] Profile fetch failed:', profileError);
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Set remember me preference cookie
    if (rememberMe) {
      cookieStore.set('remember-me', 'true', {
        httpOnly: false, // Allow client-side access for UI state
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? '.docsflow.app' : undefined,
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
    }

    // 🎯 SURGICAL FIX: Set tenant cookies like session API does
    const response = NextResponse.json({
      success: true,
      user: {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        tenant_id: userProfile.tenant_id,
        role: userProfile.role,
        access_level: userProfile.access_level,
        tenant: userProfile.tenants ? {
          id: userProfile.tenants.id,
          subdomain: userProfile.tenants.subdomain,
          name: userProfile.tenants.name,
          industry: userProfile.tenants.industry
        } : undefined
      },
      session: {
        access_token: authData.session.access_token,
        expires_at: authData.session.expires_at
      }
    }, { headers: corsHeaders });

    // 🎯 CRITICAL FIX: Set tenant cookies that middleware expects
    if (userProfile.tenant_id && userProfile.email && userProfile.tenants?.subdomain) {
      const cookieOptions = {
        httpOnly: false, // Need access for client-side redirect logic
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? '.docsflow.app' : undefined,
        maxAge: rememberMe ? (60 * 60 * 24 * 30) : (60 * 60 * 24 * 7) // Match remember me duration
      };

      response.cookies.set('tenant-id', userProfile.tenant_id, cookieOptions);
      response.cookies.set('user-email', userProfile.email, cookieOptions);
      response.cookies.set('tenant-subdomain', userProfile.tenants.subdomain, cookieOptions);
      
      // Set tenant context for multi-tenant support
      const tenantContext = {
        tenantId: userProfile.tenant_id,
        subdomain: userProfile.tenants.subdomain,
        timestamp: Date.now()
      };
      response.cookies.set('tenant-context', JSON.stringify(tenantContext), cookieOptions);
      
      // 🚨 SURGICAL FIX: Set auth token cookies that middleware/session API expect
      // This is the MISSING PIECE causing "Auth session missing!" errors
      response.cookies.set('access_token', authData.session.access_token, cookieOptions);
      response.cookies.set('docsflow_auth_token', authData.session.access_token, cookieOptions);
      
      // Also set a custom auth-token cookie as fallback for session API
      response.cookies.set('auth-token', authData.session.access_token, cookieOptions);
      
      console.log(`🎯 [LOGIN] Set tenant AND auth cookies for middleware compatibility:`, {
        tenantId: userProfile.tenant_id.substring(0, 8) + '...',
        email: userProfile.email,
        subdomain: userProfile.tenants.subdomain,
        hasAccessToken: !!authData.session.access_token,
        tokenLength: authData.session.access_token.length
      });
    }

    return response;

  } catch (error: any) {
    console.error('❌ [LOGIN-UNIFIED] Server error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { 
    status: 200, 
    headers: getCORSHeaders(origin) 
  });
}
