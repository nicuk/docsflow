import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * OFFICIAL SUPABASE SSR PATTERN
 * Single source of truth for authentication state using proper SSR client
 */
export async function GET(request: NextRequest) {
  try {
    // Check if this is a Vercel bot request (skip logging for bots)
    const userAgent = request.headers.get('user-agent') || '';
    const isVercelBot = userAgent.includes('vercel-bot') || userAgent.includes('bot');

    if (!isVercelBot) {
      console.log(`🔍 [SESSION API] Request received from: ${request.headers.get('referer') || 'direct'}`);
      console.log(`🔍 [SESSION API] User-Agent: ${userAgent.substring(0, 60)}...`);
    }

    // OFFICIAL PATTERN: Use createServerClient that handles cookies automatically
    const supabase = await createClient();

    // Get user and session from Supabase using official SSR pattern
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (!isVercelBot) {
      console.log(`🔍 [SESSION API] Supabase auth result:`, {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        userError: userError?.message,
        sessionError: sessionError?.message
      });
    }
    
    if (!user || userError) {
      if (!isVercelBot) {
        console.log(`❌ [SESSION API] Authentication failed:`, userError?.message);
      }
      
      return NextResponse.json({
        authenticated: false,
        user: null,
        tenant: null,
        onboardingComplete: false,
        error: userError?.message
      });
    }

    // Get user profile with tenant information
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        tenant_id,
        created_at,
        tenants (
          id,
          subdomain,
          name,
          industry,
          created_at
        )
      `)
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('🚨 [SESSION API] Profile fetch error:', profileError);
      console.log(`🔍 [SESSION API] User exists but no profile - needs onboarding`);
      
      return NextResponse.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: null,
          role: 'user'
        },
        tenant: null,
        onboardingComplete: false,
        debug: 'no_profile_found'
      });
    }

    // SUCCESS: Return authenticated user with tenant info
    const response = NextResponse.json({
      authenticated: true,
      user: {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        role: userProfile.role || 'user'
      },
      tenant: userProfile.tenants || null,
      onboardingComplete: !!userProfile.tenant_id,
      tenantId: userProfile.tenant_id,
      debug: 'success'
    });

    // SUPABASE SSR FIX: Set tenant context cookies for compatibility with existing middleware
    if (userProfile.tenant_id && userProfile.email && userProfile.tenants?.subdomain) {
      const cookieOptions = {
        httpOnly: false, // Need access for client-side redirect logic
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? '.docsflow.app' : undefined,
        maxAge: 60 * 60 * 24 * 7 // 7 days
      };

      response.cookies.set('tenant-id', userProfile.tenant_id, cookieOptions);
      response.cookies.set('user-email', userProfile.email, cookieOptions);
      response.cookies.set('tenant-subdomain', userProfile.tenants.subdomain, cookieOptions);
      
      // SUPABASE SSR: Also set tenant context for multi-tenant support
      const tenantContext = {
        tenantId: userProfile.tenant_id,
        subdomain: userProfile.tenants.subdomain,
        timestamp: Date.now()
      };
      response.cookies.set('tenant-context', JSON.stringify(tenantContext), cookieOptions);
      
      console.log(`🔧 [SESSION API] Set tenant context cookies:`, {
        tenantId: userProfile.tenant_id.substring(0, 8) + '...',
        email: userProfile.email,
        subdomain: userProfile.tenants.subdomain
      });
    }

    if (!isVercelBot) {
      console.log(`✅ [SESSION API] Successful authentication:`, {
        userId: userProfile.id,
        email: userProfile.email,
        tenantId: userProfile.tenant_id,
        tenantSubdomain: userProfile.tenants?.subdomain,
        onboardingComplete: !!userProfile.tenant_id
      });
    }
    
    return response;

  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}