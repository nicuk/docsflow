import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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

    const supabase = createServerClient(cookies());

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
    let accessLevel = 3;

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
          full_name: userData.name,
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
          full_name: userData.name,
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

    // Generate session for the user
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.email,
      options: {
        redirectTo: `${process.env.FRONTEND_URL || 'https://docsflow.app'}/auth/callback`
      }
    });

    if (sessionError) {
      console.error('Session generation error:', sessionError);
      return NextResponse.redirect(`${process.env.FRONTEND_URL || 'https://docsflow.app'}?error=session_error`);
    }

    // Create a session token that the frontend can use
    const sessionToken = btoa(JSON.stringify({
      user_id: userId,
      email: userData.email,
      access_level: accessLevel,
      tenant_id: tenantId,
      provider: 'google'
    }));

    // Redirect to frontend with session token
    return NextResponse.redirect(
      `${process.env.FRONTEND_URL || 'https://docsflow.app'}/auth/callback?token=${sessionToken}`
    );

  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      `${process.env.FRONTEND_URL || 'https://docsflow.app'}?error=callback_error`
    );
  }
}
