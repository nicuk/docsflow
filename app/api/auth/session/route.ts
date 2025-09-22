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

    // 🎯 CRITICAL FIX: Create Supabase client with direct cookie access
    // Parse cookies from request header (bypasses NextJS cookie isolation)
    let parsedCookies: Record<string, string> = {};
    const cookieHeader = request.headers.get('cookie');
    
    if (cookieHeader) {
      parsedCookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) {
          acc[key] = decodeURIComponent(value);
        }
        return acc;
      }, {} as Record<string, string>);
    }
    
    // Create Supabase client with direct cookie access
    const { createServerClient } = await import('@supabase/ssr');
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return Object.entries(parsedCookies).map(([name, value]) => ({ name, value }));
          },
          setAll(cookiesToSet) {
            // Can't set cookies from request header parsing, but that's ok for auth check
          },
        },
      }
    );

    // SURGICAL FIX: Try custom auth-token cookies first, then Supabase cookies
    const customAuthToken = parsedCookies['auth-token'] || 
                           parsedCookies['access_token'] || 
                           parsedCookies['docsflow_auth_token'];
    const customRefreshToken = parsedCookies['refresh-token'];
    
    let { data: { user }, error: userError } = await supabase.auth.getUser();
    let { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // If Supabase cookies don't work, try our custom auth-token cookies (from login API fix)
    if ((!user || userError) && customAuthToken) {
      console.log(`🔍 [SESSION API] Supabase cookies failed, trying custom auth tokens...`);
      const { createClient } = await import('@supabase/supabase-js');
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data: tokenUserData, error: tokenError } = await serviceSupabase.auth.getUser(customAuthToken);
      
      // 🎯 SURGICAL FIX: Supabase getUser returns { user } in data, not the user directly
      const tokenUser = tokenUserData?.user;
      
      if (tokenUser && !tokenError) {
        user = tokenUser;
        session = { access_token: customAuthToken, user: tokenUser } as any;
        userError = null;
        console.log(`✅ [SESSION API] Custom auth-token successful for user: ${tokenUser.email || 'email_missing'}`);
        console.log(`🔍 [SESSION API] Token user data:`, { id: tokenUser.id, email: tokenUser.email, hasUser: !!tokenUser });
      } else {
        console.log(`❌ [SESSION API] Custom auth-token failed:`, tokenError?.message || 'Unknown error');
        console.log(`🔍 [SESSION API] Token response debug:`, { 
          rawData: tokenUserData, 
          extractedUser: tokenUser, 
          error: tokenError 
        });
      }
    }
    
    // If cookie auth fails, try Authorization header BEFORE proceeding
    if (!user || userError) {
      const authHeader = request.headers.get('authorization');
      const xAuthToken = request.headers.get('x-auth-token');
      const token = authHeader?.replace('Bearer ', '') || xAuthToken;
      
      if (token) {
        console.log(`🔍 [SESSION API] Cookie auth failed, trying Authorization header...`);
        // SIMPLE APPROACH: Create service role client and validate JWT
        const { createClient } = await import('@supabase/supabase-js');
        const serviceSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        // Use service role to validate the JWT token
        const { data: tokenUserData, error: tokenError } = await serviceSupabase.auth.getUser(token);
        
        // 🎯 SURGICAL FIX: Extract user from data.user
        const tokenUser = tokenUserData?.user;
        
        if (tokenUser && !tokenError) {
          user = tokenUser;
          session = { access_token: token, user: tokenUser } as any;
          userError = null; // Clear the error since we found a valid user
          console.log(`✅ [SESSION API] Authorization header auth successful for user: ${tokenUser.email}`);
        } else {
          console.log(`❌ [SESSION API] Authorization header auth failed:`, tokenError?.message || 'Unknown error');
        }
      }
    }
    
    console.log(`🔍 [SESSION API] Final auth result - User: ${user?.email || 'null'}, Session: ${!!session}`);
    
    // DEBUG: Log cookie state using parsed cookies (not NextJS cookies())
    if (!isVercelBot) {
      console.log(`🔍 [SESSION API] Cookie header present: ${!!cookieHeader}`);
      console.log(`🔍 [SESSION API] Cookie header length: ${cookieHeader?.length || 0}`);
      
      const authCookieNames = Object.keys(parsedCookies).filter(name => 
        name.includes('auth') || name.includes('session') || name.includes('token')
      );
      
      // SURGICAL DEBUG: Check if Supabase cookies are present in header
      const supabaseCookieNames = Object.keys(parsedCookies).filter(name => 
        name.startsWith('sb-') || name.includes('supabase')
      );
      
      const authCookies = authCookieNames.map(name => ({ 
        name, 
        hasValue: !!parsedCookies[name], 
        valueLength: parsedCookies[name]?.length || 0 
      }));
      
      const supabaseCookies = supabaseCookieNames.map(name => ({ 
        name, 
        hasValue: !!parsedCookies[name], 
        valueLength: parsedCookies[name]?.length || 0, 
        valuePreview: parsedCookies[name]?.substring(0, 20) || 'empty' 
      }));
      
      console.log(`🔍 [SESSION API] Supabase auth result:`, {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        userError: userError?.message,
        sessionError: sessionError?.message,
        availableCookies: authCookies,
        supabaseCookies: supabaseCookies
      });
      
      // SURGICAL DEBUG: Check if session has access token
      if (session?.access_token) {
        console.log(`🔍 [SESSION API] Session access token: ${session.access_token.substring(0, 20)}... (length: ${session.access_token.length})`);
      } else {
        console.log(`❌ [SESSION API] No access token in session`);
      }
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

    // 🎯 SURGICAL FIX: Use proper join instead of nested relation (force redeploy)
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        tenant_id,
        created_at
      `)
      .eq('id', user.id)
      .single();
    
    // Get tenant information separately if user exists
    let tenantInfo = null;
    if (userProfile && userProfile.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, subdomain, name, industry, created_at')
        .eq('id', userProfile.tenant_id)
        .single();
      tenantInfo = tenant;
    }

    // SURGICAL DEBUG: Log the exact userProfile structure
    if (!isVercelBot) {
      console.log(`🔍 [SESSION API] UserProfile Debug:`, {
        userProfile: userProfile,
        hasEmail: !!userProfile?.email,
        emailValue: userProfile?.email,
        hasTenantId: !!userProfile?.tenant_id,
        tenantIdValue: userProfile?.tenant_id,
        hasTenants: !!tenantInfo,
        tenantsValue: tenantInfo,
        tenantsSubdomain: tenantInfo?.subdomain,
        profileError: profileError
      });
    }

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
      subdomain: tenantInfo?.subdomain,
      tenantName: tenantInfo?.name,
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
      tenant: tenantInfo || null,
      onboardingComplete: !!userProfile.tenant_id,
      tenantId: userProfile.tenant_id,
      // JWT GATEWAY: Include tenant context for client caching
      jwtContext: jwtTenantContext,
      debug: 'success'
    });

    // SUPABASE SSR FIX: Set tenant context cookies for compatibility with existing middleware
    if (userProfile.tenant_id && userProfile.email && tenantInfo?.subdomain) {
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
      response.cookies.set('tenant-subdomain', tenantInfo.subdomain, cookieOptions);
      
      // SUPABASE SSR: Also set tenant context for multi-tenant support
      const tenantContext = {
        tenantId: userProfile.tenant_id,
        subdomain: tenantInfo.subdomain,
        timestamp: Date.now()
      };
      response.cookies.set('tenant-context', JSON.stringify(tenantContext), cookieOptions);
      
      console.log(`🔧 [SESSION API] Set tenant context cookies:`, {
        tenantId: userProfile.tenant_id.substring(0, 8) + '...',
        email: userProfile.email,
        subdomain: tenantInfo.subdomain
      });
      
      // SURGICAL DEBUG: Log what cookies are actually being set
      console.log(`🔍 [SESSION API] Cookie values being set:`, {
        'tenant-id': userProfile.tenant_id,
        'user-email': userProfile.email,
        'tenant-subdomain': tenantInfo?.subdomain,
        'tenant-context': JSON.stringify(tenantContext)
      });
    }

    if (!isVercelBot) {
      console.log(`✅ [SESSION API] Successful authentication:`, {
        userId: userProfile.id,
        email: userProfile.email,
        tenantId: userProfile.tenant_id,
        tenantSubdomain: tenantInfo?.subdomain,
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