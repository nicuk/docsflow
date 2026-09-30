import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getCORSHeaders } from '@/lib/utils';
import { createCORSResponse } from '@/lib/cookie-utils';
import type { TenantRelation } from '@/types/database';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: getCORSHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    // tenantId / accessLevel in the body are ignored. A new account belongs to
    // no tenant and has member access; it gets a tenant by creating one in
    // onboarding or by accepting an invitation, never by naming one here.
    const { email, password, companyName } = await request.json();
    const accessLevel = 2;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Force domain for all Supabase cookies (cross-subdomain)
              const enhancedOptions = {
                ...options,
                domain: process.env.NODE_ENV === 'production' ? '.docsflow.app' : undefined,
                path: '/',
                sameSite: 'lax' as const
              };
              cookieStore.set(name, value, enhancedOptions);
            })
          },
        },
      }
    );

    // Create user with proper Supabase signup flow (includes email verification)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          access_level: accessLevel,
          role: 'user',
          company_name: companyName
        }
      }
    });

    if (authError) {
      // Handle specific auth errors
      if (authError.status === 422 && authError.message.includes('User already registered')) {
        return NextResponse.json(
          { error: 'User already exists', details: 'A user with this email address already exists.' },
          { status: 422, headers: corsHeaders }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create user', details: authError.message },
        { status: authError.status || 400, headers: corsHeaders }
      );
    }

    // Create user profile in users table
    // tenant_id stays null: the user creates or joins a tenant afterwards.
    const userInsertData: any = {
      id: authData.user?.id,
      email: authData.user?.email,
      name: companyName, // Store actual company name (e.g., 'bitto')
      access_level: accessLevel,
      role: 'user',
      created_at: new Date().toISOString()
    };
    
    const { error: profileError } = await supabase
      .from('users')
      .insert(userInsertData);

    if (profileError) {
      // Don't fail the request if profile creation fails
    }

    // Get user profile with tenant info (tenant may be null for new signups)
    const { data: userProfile, error: fetchProfileError } = await supabase
      .from('users')
      .select(`
        *,
        tenants (
          id,
          subdomain,
          name,
          industry,
          custom_persona
        )
      `)
      .eq('id', authData.user?.id)
      .maybeSingle();

    if (fetchProfileError) {
      // Continue without profile data
    }

    // Let Supabase handle email verification based on your dashboard settings
    // If email verification is disabled in Supabase, authData.session will exist
    // If email verification is enabled, authData.session will be null until verified
    if (!authData.session && authData.user) {
      // Email verification is required (based on your Supabase settings)
      return NextResponse.json({
        success: true,
        requiresEmailVerification: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: companyName
        },
        message: 'Account created! Please check your email and click the verification link to continue to onboarding.',
        nextStep: 'email_verification'
      }, { headers: corsHeaders });
    }

    if (authData.session) {
      const { createResponseWithSessionCookies } = await import('@/lib/cookie-utils');
      
      const response = createResponseWithSessionCookies({
        success: true,
        user: {
          id: authData.user?.id,
          email: authData.user?.email,
          name: companyName,
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
        },
        onboardingComplete: !!userProfile?.tenant_id,
        tenantId: userProfile?.tenant_id,
        tenant: userProfile?.tenant_id ? {
          subdomain: (userProfile.tenants as unknown as TenantRelation)?.subdomain,
          name: (userProfile.tenants as unknown as TenantRelation)?.name,
          industry: (userProfile.tenants as unknown as TenantRelation)?.industry
        } : null,
        message: 'Registration successful! Redirecting to onboarding.',
        nextStep: 'onboarding'
      }, {
        userEmail: authData.user?.email || email,
        userName: companyName,
        tenantId: userProfile?.tenant_id ? (userProfile.tenants as unknown as TenantRelation)?.subdomain : undefined,
        onboardingComplete: !!userProfile?.tenant_id
      });

      // CRITICAL: Also set auth tokens with proper domain using cookieStore
      cookieStore.set('auth-token', authData.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? '.docsflow.app' : undefined,
        maxAge: authData.session.expires_in || 3600
      });

      cookieStore.set('refresh-token', authData.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? '.docsflow.app' : undefined,
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });

      // Set user info cookies (accessible to client)
      cookieStore.set('user-email', email, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? '.docsflow.app' : undefined,
        maxAge: 60 * 60 * 24 * 7
      });

      cookieStore.set('onboarding-complete', 'false', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? '.docsflow.app' : undefined,
        maxAge: 60 * 60 * 24 * 7
      });

      return response;
    }

    // Fallback for email verification flow
    return NextResponse.json({
      success: true,
      user: {
        id: authData.user?.id,
        email: authData.user?.email,
        access_token: null,
        refresh_token: null,
        tenant_id: userProfile?.tenant_id ?? null,
        access_level: accessLevel,
        tenant: userProfile?.tenants,
        name: companyName
      },
      message: 'User registered successfully'
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Registration failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
} 