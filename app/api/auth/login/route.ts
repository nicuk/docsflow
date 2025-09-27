/**
 * UNIFIED ENTERPRISE LOGIN API
 * 
 * Single source of truth for authentication
 * Handles multi-tenant auth with proper RLS context establishment
 * Consolidated from previous dual-route architecture
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

    // Create Supabase client with multi-tenant cookie domain
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            // SURGICAL FIX: Set domain for cross-subdomain access
            const enhancedOptions = {
              ...options,
              domain: process.env.NODE_ENV === 'production' ? '.docsflow.app' : '.localhost',
              path: '/',
              sameSite: 'lax' as const,
              secure: process.env.NODE_ENV === 'production'
            };
            cookieStore.set(name, value, enhancedOptions);
          },
          remove(name, options) {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
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

    // ✅ REAL SURGICAL FIX: Establish session context properly for SSR
    console.log('🎯 [LOGIN] Establishing session context for RLS');
    
    // CRITICAL: Set the session in the supabase client for server-side RLS context
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token
    });
    
    if (sessionError) {
      console.error('🔐 [LOGIN] Failed to establish session context:', sessionError.message);
      // Don't fail here - try with service role as fallback
    } else {
      console.log('✅ [LOGIN] Session context established for RLS policies');
    }

    // Now try to fetch user profile with proper RLS context
    let { data: userProfile, error: profileError } = await supabase
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
      .single();

    // FALLBACK: If RLS still fails, use service role as backup
    if (profileError && profileError.code === 'PGRST116') {
      console.log('🔧 [LOGIN] RLS context failed, falling back to service role');
      
      const { createClient } = await import('@supabase/supabase-js');
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const result = await serviceSupabase
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
        .single();
      
      userProfile = result.data;
      profileError = result.error;
      
      if (!profileError) {
        console.log('✅ [LOGIN] Service role fallback successful');
      }
    }

    if (profileError || !userProfile) {
      console.error('🔐 [LOGIN] Profile fetch failed with RLS context:', {
        profileError: profileError,
        profileErrorCode: profileError?.code,
        profileErrorMessage: profileError?.message,
        authUserId: authData.user.id,
        sessionEstablished: !!authData.session
      });
      
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

    // Let Supabase handle its own cookies, then add our tenant info
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

    console.log('✅ [LOGIN] Authentication successful, Supabase cookies should be set automatically');
    console.log(`🎯 [LOGIN] User: ${userProfile.email}, Tenant: ${userProfile.tenants?.subdomain}`);

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
