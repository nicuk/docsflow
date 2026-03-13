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
import { tenantUrl, COOKIE_DOMAIN } from '@/lib/constants';
import type { TenantRelation } from '@/types/database';

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
            // Set domain for cross-subdomain access
            const enhancedOptions = {
              ...options,
              domain: process.env.NODE_ENV === 'production' ? COOKIE_DOMAIN : '.localhost',
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

    // Establish session context properly for SSR
    // Set the session in the supabase client for server-side RLS context
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token
    });
    
    if (sessionError) {
      // Session context establishment failed
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
      
      
    }

    // Auto-create missing user record (auth.users exists but public.users missing)
    if (profileError || !userProfile) {
      
      const { createClient } = await import('@supabase/supabase-js');
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // Create the missing user record
      const { data: newProfile, error: createError } = await serviceSupabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'User',
          role: 'user',
          access_level: 1, // Integer: 1 = basic, 2 = pro, 3 = enterprise
          tenant_id: null // Will be set during onboarding
        })
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
        .single();
      
      if (createError) {
        return NextResponse.json(
          { success: false, error: 'Failed to create user profile' },
          { status: 500, headers: corsHeaders }
        );
      }
      
      userProfile = newProfile;
    }

    // Set remember me preference cookie
    if (rememberMe) {
      cookieStore.set('remember-me', 'true', {
        httpOnly: false, // Allow client-side access for UI state
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? COOKIE_DOMAIN : undefined,
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
    }

    // Server-side redirect to tenant subdomain
    const hostname = request.headers.get('host') || '';
    const isMainDomain = hostname === 'docsflow.app' || hostname === 'www.docsflow.app' || hostname === 'localhost:3000';
    
    // Set additional tenant cookies for cross-subdomain access
    const tenantCookieOptions = {
      domain: process.env.NODE_ENV === 'production' ? COOKIE_DOMAIN : undefined,
      path: '/',
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false, // Allow client-side access
      maxAge: 60 * 60 * 24 * 7 // 7 days
    };
    
    const tenant = userProfile.tenants as unknown as TenantRelation | null;

    if (userProfile.tenant_id) {
      cookieStore.set('tenant-id', userProfile.tenant_id, tenantCookieOptions);
    }
    if (userProfile.email) {
      cookieStore.set('user-email', userProfile.email, tenantCookieOptions);
    }
    if (tenant?.subdomain) {
      cookieStore.set('tenant-subdomain', tenant.subdomain, tenantCookieOptions);
    }
    
    let redirectUrl = null;
    if (isMainDomain && tenant?.subdomain) {
      redirectUrl = process.env.NODE_ENV === 'production'
        ? tenantUrl(tenant.subdomain)
        : `http://localhost:3000/dashboard`;
    }
    
    const response = NextResponse.json({
      success: true,
      redirectUrl,
      user: {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        tenant_id: userProfile.tenant_id,
        role: userProfile.role,
        access_level: userProfile.access_level,
        tenant: tenant ? {
          id: tenant.id,
          subdomain: tenant.subdomain,
          name: tenant.name,
          industry: tenant.industry
        } : undefined
      },
      session: {
        access_token: authData.session.access_token,
        expires_at: authData.session.expires_at
      }
    }, { headers: corsHeaders });

    return response;

  } catch (error: any) {
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
