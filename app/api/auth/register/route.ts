import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getCORSHeaders } from '@/lib/utils';
import { createCORSResponse } from '@/lib/cookie-utils';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: getCORSHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    const { email, password, tenantId, accessLevel = 3, companyName } = await request.json();

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

    // Create user with proper Supabase signup flow (includes email verification)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          tenant_id: tenantId,
          access_level: accessLevel,
          role: 'user',
          company_name: companyName
        }
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      
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
    // If no tenant_id provided, leave it null - user will select/create tenant during onboarding
    const userInsertData: any = {
      id: authData.user?.id,
      email: authData.user?.email,
      name: companyName, // Store actual company name (e.g., 'bitto')
      access_level: accessLevel,
      role: 'user',
      created_at: new Date().toISOString()
    };
    
    // Only add tenant_id if it's a valid UUID
    if (tenantId && tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      userInsertData.tenant_id = tenantId;
    }

    const { error: profileError } = await supabase
      .from('users')
      .insert(userInsertData);

    if (profileError) {
      console.error('Profile creation error:', profileError);
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
      console.error('Profile fetch error:', fetchProfileError);
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

    // CRITICAL FIX: Set session cookies when session exists (email verification disabled)
    if (authData.session) {
      const response = NextResponse.json({
        success: true,
        user: {
          id: authData.user?.id,
          email: authData.user?.email,
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          tenant_id: tenantId,
          access_level: accessLevel,
          tenant: userProfile?.tenants,
          name: companyName
        },
        message: 'User registered successfully'
      }, { headers: corsHeaders });

      // Set correct Supabase session cookies for immediate auth recognition
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/'
      };

      // Use Supabase's actual cookie names
      response.cookies.set(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`, JSON.stringify({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_in: authData.session.expires_in,
        expires_at: authData.session.expires_at,
        token_type: authData.session.token_type,
        user: authData.user
      }), {
        ...cookieOptions,
        maxAge: authData.session.expires_in || 3600
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
        tenant_id: tenantId,
        access_level: accessLevel,
        tenant: userProfile?.tenants,
        name: companyName
      },
      message: 'User registered successfully'
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
} 