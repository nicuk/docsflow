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

    // SURGICAL FIX: Get user and session with cookie debugging
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // DEBUG: Log cookie state for server restart issues
    if (!isVercelBot) {
      const cookies = await import('next/headers').then(m => m.cookies());
      const authCookies = (await cookies()).getAll().filter(c => 
        c.name.includes('auth') || c.name.includes('session') || c.name.includes('token')
      );
      
      console.log(`🔍 [SESSION API] Supabase auth result:`, {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        userError: userError?.message,
        sessionError: sessionError?.message,
        availableCookies: authCookies.map(c => ({ name: c.name, hasValue: !!c.value, valueLength: c.value?.length || 0 }))
      });
    }
    
    if (!user || userError) {
      if (!isVercelBot) {
        console.log(`❌ [SESSION API] Authentication failed:`, userError?.message || 'Auth session missing!');
      }
      
      return NextResponse.json({
        authenticated: false,
        user: null,
        tenant: null,
        onboardingComplete: false,
        error: userError?.message || 'Auth session missing!'
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
      if (!isVercelBot) {
        console.error('🚨 [SESSION API] Profile fetch error:', profileError);
        console.log(`🔍 [SESSION API] User exists but no profile - user ID: ${user.id}, email: ${user.email}`);
        console.log(`🔍 [SESSION API] Checking if this is a cross-domain session issue...`);
      }
      
      // SUPABASE SSR FIX: Check for tenant context in cookies for cross-domain sessions
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const tenantId = cookieStore.get('tenant-id')?.value;
      const tenantSubdomain = cookieStore.get('tenant-subdomain')?.value;
      const tenantContext = cookieStore.get('tenant-context')?.value;
      
      if (!isVercelBot) {
        console.log(`🔍 [SESSION API] Checking cookie fallback - tenantId: ${tenantId}, subdomain: ${tenantSubdomain}`);
      }
      
      // If we have tenant info in cookies, use it as fallback
      if (tenantId && tenantSubdomain) {
        let parsedTenantContext = null;
        try {
          parsedTenantContext = tenantContext ? JSON.parse(tenantContext) : null;
        } catch (e) {
          console.warn('Failed to parse tenant context cookie');
        }
        
        return NextResponse.json({
          authenticated: true,
          user: {
            id: user.id,
            email: user.email || 'cross_domain_session',
            name: null,
            role: 'user'
          },
          tenant: {
            id: tenantId,
            subdomain: tenantSubdomain,
            name: parsedTenantContext?.name || tenantSubdomain
          },
          tenantId: tenantId,
          onboardingComplete: true, // If they have tenant cookies, they're onboarded
          debug: 'cookie_fallback_success'
        });
      }
      
      // No profile and no tenant cookies - likely needs onboarding
      return NextResponse.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email || 'email_missing_cross_domain',
          name: null,
          role: 'user'
        },
        tenant: null,
        onboardingComplete: false,
        debug: 'profile_fetch_failed',
        crossDomainIssue: true
      });
    }

    // JWT GATEWAY: Create tenant context for client-side caching
    const jwtTenantContext = {
      tenantId: userProfile.tenant_id,
      subdomain: userProfile.tenants?.subdomain,
      tenantName: userProfile.tenants?.name,
      userRole: userProfile.role,
      accessLevel: userProfile.access_level,
      timestamp: Date.now()
    };

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
      // JWT GATEWAY: Include tenant context for client caching
      jwtContext: jwtTenantContext,
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