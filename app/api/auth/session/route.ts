import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Single source of truth for authentication state
 * This endpoint can read HttpOnly cookies and return the full session
 */
export async function GET(request: NextRequest) {
  try {
    // Skip verbose logging for Vercel automation
    const userAgent = request.headers.get('user-agent') || '';
    const isVercelBot = userAgent.includes('vercel-screenshot') || 
                       userAgent.includes('vercel-bot') ||
                       userAgent.includes('vercel/');
    
    if (!isVercelBot) {
      console.log(`🔍 [SESSION API] Request received from: ${request.headers.get('referer')}`);
      console.log(`🔍 [SESSION API] User-Agent: ${userAgent.substring(0, 50)}...`);
    }
    
    const cookieStore = await cookies();
    
    // Note: Multi-tenant cookies read manually server-side (no client-side manager)
    
    if (!isVercelBot) {
      // DEBUGGING: Enhanced cookie state logging
      const allCookies = cookieStore.getAll();
      console.log(`🔍 [SESSION API] Raw cookies: ${allCookies.map(c => c.name).join(', ')}`);
      
      // FIX #1: Use unified auth cookie validation
      const serverCookies = allCookies.reduce((acc, cookie) => {
        acc[cookie.name] = cookie.value;
        return acc;
      }, {} as Record<string, string>);
      
      // SERVER-SIDE: Read multi-tenant cookies manually (no client-side methods)
      const tenantContextsRaw = serverCookies['tenant-contexts'];
      let tenantContexts = {};
      try {
        tenantContexts = tenantContextsRaw ? JSON.parse(tenantContextsRaw) : {};
      } catch (e) {
        console.warn('🔄 [SESSION API] Invalid tenant-contexts cookie, using empty');
      }
      
      const currentTenant = serverCookies['current-tenant'];
      const authToken = serverCookies['docsflow_auth_token'] || 
                       serverCookies['sb-lhcopwwiqwjpzbdnjovo-auth-token'] ||
                       serverCookies['access_token'];
      
      console.log(`🔍 [SESSION API] Multi-tenant auth state:`, {
        hasAuthToken: !!authToken,
        currentTenant,
        totalTenants: Object.keys(tenantContexts).length,
        availableTenants: Object.keys(tenantContexts)
      });
    }
    
    // 🚨 SECURITY FIX #2: Create Supabase client with schema-aligned cookie reading
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // SURGICAL FIX: Bridge cookies ONLY when Supabase cookies are missing
            const allCookies = cookieStore.getAll();
            const hasSupabaseAuth = allCookies.find(c => c.name === 'sb-lhcopwwiqwjpzbdnjovo-auth-token');
            
            // If Supabase cookies already exist, return them as-is (no bridging needed)
            if (hasSupabaseAuth) {
              // DEBUG: Let's see what's actually in these cookies
              const authCookie = allCookies.find(c => c.name === 'sb-lhcopwwiqwjpzbdnjovo-auth-token');
              const unifiedToken = allCookies.find(c => c.name === 'docsflow_auth_token');
              
              console.log(`🔍 [SESSION API] DEBUGGING COOKIE VALUES:`, {
                hasSupabaseAuth: !!authCookie,
                supabaseTokenLength: authCookie?.value?.length || 0,
                supabaseTokenPreview: authCookie?.value?.substring(0, 50) + '...',
                hasUnifiedToken: !!unifiedToken,
                unifiedTokenLength: unifiedToken?.value?.length || 0,
                unifiedTokenPreview: unifiedToken?.value?.substring(0, 50) + '...',
                tokensMatch: authCookie?.value === unifiedToken?.value,
                totalCookies: allCookies.length
              });
              
              return allCookies;
            }
            
            // Otherwise, check for our unified cookies and bridge them
            const unifiedAuthToken = cookieStore.get('docsflow_auth_token')?.value ||
                                   cookieStore.get('access_token')?.value;
            
            if (unifiedAuthToken) {
              console.log(`🔗 [SESSION API] Bridging unified token to Supabase format (one-time)`);
              
              // Add Supabase-formatted cookies
              const bridgedCookies = [...allCookies];
              bridgedCookies.push({
                name: 'sb-lhcopwwiqwjpzbdnjovo-auth-token',
                value: unifiedAuthToken
              });
              
              const refreshToken = cookieStore.get('docsflow_refresh_token')?.value ||
                                 cookieStore.get('refresh_token')?.value;
              if (refreshToken) {
                bridgedCookies.push({
                  name: 'sb-lhcopwwiqwjpzbdnjovo-refresh-token',
                  value: refreshToken
                });
              }
              
              return bridgedCookies;
            }
            
            // No cookies to bridge
            return allCookies;
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch (error) {
              // Ignore cookie set errors in server components
            }
          },
        },
      }
    );

    // Get user and session from Supabase
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
      // User exists but profile not found - needs onboarding
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

    // CRITICAL FIX: Set missing tenant context cookies when authentication succeeds
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

    // SCHEMA COMPLIANCE: Set cookies according to schema-aligned-cookies.ts
    // Note: tenant-subdomain should be header-only, not a cookie per schema spec
    if (userProfile.tenant_id && userProfile.email && userProfile.tenants?.subdomain) {
      const cookieOptions = {
        path: '/',
        domain: '.docsflow.app',
        secure: true,
        sameSite: 'lax' as const,
        maxAge: 60 * 60 * 24 // 24 hours
      };

      // Follow schema: tenant-id (UUID) and user-email cookies only
      response.cookies.set('tenant-id', userProfile.tenant_id, cookieOptions);
      response.cookies.set('user-email', userProfile.email, cookieOptions);
      
      // REDIRECT FIX: Add tenant-subdomain cookie for middleware redirect logic
      response.cookies.set('tenant-subdomain', userProfile.tenants.subdomain, cookieOptions);
      
      // UNIFIED ARCHITECTURE: Set auth tokens using our MultiTenantCookieManager format
      if (session?.access_token) {
        const authCookieOptions = {
          ...cookieOptions,
          httpOnly: false, // Must be accessible for frontend API calls
          maxAge: 60 * 60 * 1 // 1 hour for auth tokens
        };
        
        // Set unified auth tokens (compatible with MultiTenantCookieManager)
        response.cookies.set('docsflow_auth_token', session.access_token, authCookieOptions);
        response.cookies.set('sb-lhcopwwiqwjpzbdnjovo-auth-token', session.access_token, authCookieOptions);
        response.cookies.set('access_token', session.access_token, authCookieOptions);
        
        if (session.refresh_token) {
          response.cookies.set('docsflow_refresh_token', session.refresh_token, authCookieOptions);
          response.cookies.set('refresh_token', session.refresh_token, authCookieOptions);
        }
        
        console.log(`🔑 [SESSION API] Set unified auth tokens for cross-domain API access`);
      } else {
        console.warn(`⚠️ [SESSION API] No access token in session - unified tokens not set`);
      }
      
      console.log(`🔧 [SESSION API] Set complete tenant context cookies:`, {
        tenantId: userProfile.tenant_id.substring(0, 8) + '...',
        email: userProfile.email,
        subdomain: userProfile.tenants.subdomain
      });
    }

    console.log(`✅ [SESSION API] Successful authentication:`, {
      userId: userProfile.id,
      email: userProfile.email,
      tenantId: userProfile.tenant_id,
      tenantSubdomain: userProfile.tenants?.subdomain,
      onboardingComplete: !!userProfile.tenant_id
    });
    
    return response;

  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({
      authenticated: false,
      user: null,
      tenant: null,
      onboardingComplete: false,
      error: 'Session check failed'
    }, { status: 500 });
  }
}
