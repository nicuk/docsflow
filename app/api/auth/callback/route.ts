import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.session) {
      // Get user details
      const { data: { user } } = await supabase.auth.getUser();
      
      // Redirect to dashboard or next URL
      const redirectUrl = new URL(next, 'https://docsflow.app');
      
      const response = NextResponse.redirect(redirectUrl);
      
      // Set session cookies for the custom domain
      response.cookies.set('access_token', data.session.access_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        domain: '.docsflow.app', // Allow subdomain access
        path: '/'
      });
      
      response.cookies.set('refresh_token', data.session.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        domain: '.docsflow.app',
        path: '/'
      });
      
      if (user?.email) {
        response.cookies.set('user_email', user.email, {
          httpOnly: false,
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          domain: '.docsflow.app',
          path: '/'
        });
      }
      
      return response;
    }
  }

  // Auth failed - redirect to login
  return NextResponse.redirect(new URL('/login?error=auth_failed', 'https://docsflow.app'));
}
