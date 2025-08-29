import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getCORSHeaders } from '@/lib/utils';
import { createResponseWithSessionCookies } from '@/lib/cookie-utils';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: getCORSHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    const { email, password, rememberMe } = await request.json();

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
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    );

    // Sign in user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    // CRITICAL FIX: Ensure session is properly set
    if (authData.session) {
      // Manually set the session to ensure cookies are set
      await supabase.auth.setSession({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token
      });
    }

    if (authError) {
      console.error('Login error:', authError);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Invalid credentials';
      let statusCode = 401;
      
      // Check if user exists first to provide more specific error
      if (authError.message.includes('Invalid login credentials')) {
        try {
          const { data: userExists } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();
          
          if (userExists) {
            errorMessage = 'Incorrect password. Please check your password and try again.';
          } else {
            errorMessage = 'No account found with this email address. Please check your email or sign up.';
          }
        } catch (checkError) {
          // If we can't check, fall back to generic message
          errorMessage = 'Invalid email or password. Please check your credentials.';
        }
      } else if (authError.message.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and confirm your account before signing in.';
        statusCode = 403;
      } else if (authError.message.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please wait a few minutes and try again.';
        statusCode = 429;
      } else if (authError.message.includes('User not found')) {
        errorMessage = 'No account found with this email address. Please check your email or sign up.';
      }
      
      return NextResponse.json(
        { 
          error: errorMessage, 
          details: process.env.NODE_ENV === 'development' ? authError.message : undefined,
          code: authError.status || statusCode 
        },
        { status: statusCode, headers: corsHeaders }
      );
    }

    // Get user profile with tenant info
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        tenant_id,
        access_level,
        role,
        tenants (
          id,
          subdomain,
          name,
          industry,
          custom_persona
        )
      `)
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      // Continue without profile data
    }

    // Check actual onboarding completion status from database
    // Since onboarding_complete column doesn't exist, check if user has tenant_id
    const hasCompletedOnboarding = userProfile?.tenant_id ? true : false;
    
    // 🚨 SECURITY FIX #1: Use schema-aligned cookie management
    const { SchemaAlignedCookieManager } = await import('@/lib/schema-aligned-cookies');
    
    if (!userProfile?.tenant_id || !userProfile.tenants) {
      return NextResponse.json(
        { error: 'User profile incomplete - tenant information missing' },
        { status: 400, headers: corsHeaders }
      );
    }

    const tenantContext = {
      tenantId: userProfile.tenant_id,
      subdomain: (userProfile.tenants as any).subdomain,
      userEmail: authData.user.email!
    };

    const tokens = {
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token
    };

    // Clear any existing contaminated cookies first
    SchemaAlignedCookieManager.clearAllAuthCookies();
    
    // Set standardized, validated cookies
    SchemaAlignedCookieManager.setSchemaAlignedCookies(tenantContext, tokens);
    
    const response = NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        tenant_id: userProfile.tenant_id,
        role: userProfile.role,
        access_level: userProfile.access_level,
        onboarding_complete: hasCompletedOnboarding
      },
      tenant: {
        id: (userProfile.tenants as any).id,
        subdomain: (userProfile.tenants as any).subdomain,
        name: (userProfile.tenants as any).name,
        industry: (userProfile.tenants as any).industry
      },
      message: 'Login successful - schema-aligned cookies set'
    }, { headers: corsHeaders });
    
    // Also set server-side cookies for immediate session compatibility
    const authCookieStore = await cookies();
    
    // REMEMBER ME FIX: Set cookie duration based on user preference
    const authTokenMaxAge = rememberMe ? (60 * 60 * 24 * 30) : (authData.session.expires_in || 3600);
    const refreshTokenMaxAge = rememberMe ? (60 * 60 * 24 * 30) : (60 * 60 * 24 * 7);
    
    // Set server-side cookies in standardized format
    authCookieStore.set('access_token', authData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.docsflow.app' : undefined,
      maxAge: authTokenMaxAge
    });

    authCookieStore.set('refresh_token', authData.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.docsflow.app' : undefined,
      maxAge: refreshTokenMaxAge
    });
    
    return response;

  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
} 