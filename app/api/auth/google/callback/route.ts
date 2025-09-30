import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getCORSHeaders } from '@/lib/utils';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: getCORSHeaders(origin) });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(`${process.env.FRONTEND_URL || 'https://docsflow.app'}?error=oauth_error`);
    }

    if (!code) {
      return NextResponse.redirect(`${process.env.FRONTEND_URL || 'https://docsflow.app'}?error=no_code`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Google OAuth configuration missing');
      return NextResponse.redirect(`${process.env.FRONTEND_URL || 'https://docsflow.app'}?error=config_error`);
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange error:', tokenData);
      return NextResponse.redirect(`${process.env.FRONTEND_URL || 'https://docsflow.app'}?error=token_error`);
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      console.error('User info error:', userData);
      return NextResponse.redirect(`${process.env.FRONTEND_URL || 'https://docsflow.app'}?error=user_info_error`);
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

    // Check if user exists
    let { data: existingUser, error: userLookupError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userData.email)
      .single();

    if (userLookupError && userLookupError.code !== 'PGRST116') {
      console.error('User lookup error:', userLookupError);
      return NextResponse.redirect(`${process.env.FRONTEND_URL || 'https://docsflow.app'}?error=lookup_error`);
    }

    let userId;
    let tenantId;
    let accessLevel = 2;

    if (existingUser) {
      // User exists, sign them in
      userId = existingUser.id;
      tenantId = existingUser.tenant_id;
      accessLevel = existingUser.access_level;
    } else {
      // Create new user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        user_metadata: {
          name: userData.name,
          picture: userData.picture,
          provider: 'google',
          google_id: userData.id
        },
        email_confirm: true // Auto-confirm Google users
      });

      if (authError) {
        console.error('Auth user creation error:', authError);
        return NextResponse.redirect(`${process.env.FRONTEND_URL || 'https://docsflow.app'}?error=auth_error`);
      }

      userId = authData.user.id;

      // Create user profile in users table
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: userData.email,
          name: userData.name,
          avatar_url: userData.picture,
          provider: 'google',
          google_id: userData.id,
          tenant_id: null, // Will be set when they create/join a tenant
          access_level: accessLevel,
          role: 'user',
          created_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Continue anyway
      }
    }

    // 🎯 CRITICAL FIX: Create REAL Supabase session (not fake token)
    // Use admin API to sign in the user and get a real JWT
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.createSession({
      user_id: userId,
    });

    if (sessionError || !sessionData.session) {
      console.error('Session creation error:', sessionError);
      return NextResponse.redirect(`${process.env.FRONTEND_URL || 'https://docsflow.app'}?error=session_error`);
    }

    console.log('✅ [GOOGLE OAuth] Real Supabase session created:', {
      userId,
      hasAccessToken: !!sessionData.session.access_token,
      hasRefreshToken: !!sessionData.session.refresh_token
    });

    // Set Supabase session cookies with proper domain
    const cookieOptions = {
      domain: process.env.NODE_ENV === 'production' ? '.docsflow.app' : undefined,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      httpOnly: true, // Security: Prevent XSS
      maxAge: 60 * 60 * 24 * 7 // 7 days
    };
    
    // Create response that will be redirected
    let redirectUrl: string;
    let redirectResponse: NextResponse;
    
    // DIRECT REDIRECT: Skip auth callback page entirely
    if (tenantId) {
      // Get tenant subdomain
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('subdomain')
        .eq('id', tenantId)
        .single();
      
      if (tenantData?.subdomain) {
        console.log(`✅ [GOOGLE OAuth] Redirecting user to tenant ${tenantData.subdomain}`);
        // Existing user: redirect directly to tenant dashboard
        redirectUrl = process.env.NODE_ENV === 'production'
          ? `https://${tenantData.subdomain}.docsflow.app/dashboard`
          : `http://localhost:3000/dashboard`;
        
        redirectResponse = NextResponse.redirect(redirectUrl);
        
        // Set REAL Supabase session cookies
        redirectResponse.cookies.set('sb-access-token', sessionData.session.access_token, cookieOptions);
        redirectResponse.cookies.set('sb-refresh-token', sessionData.session.refresh_token, {
          ...cookieOptions,
          httpOnly: true
        });
        
        // Set tenant info cookies
        redirectResponse.cookies.set('tenant-id', tenantId, {
          ...cookieOptions,
          httpOnly: false // Allow client-side access
        });
        redirectResponse.cookies.set('user-email', userData.email, {
          ...cookieOptions,
          httpOnly: false
        });
        redirectResponse.cookies.set('tenant-subdomain', tenantData.subdomain, {
          ...cookieOptions,
          httpOnly: false
        });
        
        return redirectResponse;
      } else {
        console.error(`❌ [GOOGLE OAuth] Tenant ${tenantId} has no subdomain:`, tenantError);
      }
    }
    
    // New user or no tenant: redirect to onboarding
    console.log(`🆕 [GOOGLE OAuth] New user redirecting to onboarding`);
    redirectUrl = `${process.env.FRONTEND_URL || 'https://docsflow.app'}/onboarding`;
    redirectResponse = NextResponse.redirect(redirectUrl);
    
    // Set session cookies for onboarding flow
    redirectResponse.cookies.set('sb-access-token', sessionData.session.access_token, cookieOptions);
    redirectResponse.cookies.set('sb-refresh-token', sessionData.session.refresh_token, {
      ...cookieOptions,
      httpOnly: true
    });
    
    return redirectResponse;

  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      `${process.env.FRONTEND_URL || 'https://docsflow.app'}?error=callback_error`
    );
  }
}
