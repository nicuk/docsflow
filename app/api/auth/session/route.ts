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
    
    // 🚨 SECURITY FIX #2: Use schema-aligned cookie validation
    const { SchemaAlignedCookieManager } = await import('@/lib/schema-aligned-cookies');
    
    if (!isVercelBot) {
      // DEBUGGING: Enhanced cookie state logging
      const allCookies = cookieStore.getAll();
      console.log(`🔍 [SESSION API] Raw cookies: ${allCookies.map(c => c.name).join(', ')}`);
      
      // Validate cookie integrity using schema manager (server-side compatible)
      const serverCookies = allCookies.reduce((acc, cookie) => {
        acc[cookie.name] = cookie.value;
        return acc;
      }, {} as Record<string, string>);
      SchemaAlignedCookieManager.debugCookieState(serverCookies);
      
      const hasSupabaseAuth = !!cookieStore.get('sb-lhcopwwiqwjpzbdnjovo-auth-token')?.value;
      const hasAccessToken = !!cookieStore.get('access_token')?.value;
      const hasRefreshToken = !!cookieStore.get('refresh_token')?.value;
      
      console.log(`🔍 [SESSION API] Auth cookies - Supabase: ${hasSupabaseAuth}, access_token: ${hasAccessToken}, refresh_token: ${hasRefreshToken}`);
    }
    
    // 🚨 SECURITY FIX #2: Create Supabase client with schema-aligned cookie reading
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // SURGICAL FIX: Use existing Supabase cookies directly instead of reconstructing
            const allCookies = cookieStore.getAll();
            
            // Check if we have the existing Supabase session cookie
            const existingSupabaseAuth = cookieStore.get('sb-lhcopwwiqwjpzbdnjovo-auth-token')?.value;
            
            if (existingSupabaseAuth && existingSupabaseAuth.length > 50) {
              console.log('✅ [SESSION API] Using existing Supabase auth token');
              // Return all cookies as-is - Supabase will handle the existing session cookie
              return allCookies;
            }
            
            // Fallback: try manual token construction only if no Supabase cookie exists
            const accessToken = cookieStore.get('access_token')?.value;
            const refreshToken = cookieStore.get('refresh_token')?.value;
            const validatedCookies = [];
            
            if (accessToken && accessToken.length > 10) {
              validatedCookies.push({
                name: `sb-lhcopwwiqwjpzbdnjovo-auth-token`,
                value: accessToken
              });
              console.log('✅ [SESSION API] Using fallback access_token');
            } else if (!isVercelBot) {
              console.warn('🚨 [SESSION API] No valid auth tokens found');
            }
            
            return [...allCookies, ...validatedCookies];
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

    // SECURITY FIX: Use getUser() instead of getSession() for authenticated data
    if (!isVercelBot) {
      console.log(`🔍 [SESSION API] Calling supabase.auth.getUser()...`);
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!isVercelBot) {
      console.log(`🔍 [SESSION API] Supabase auth result:`, {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        error: userError?.message
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

    // Return complete session data
    console.log(`✅ [SESSION API] Successful authentication:`, {
      userId: userProfile.id,
      email: userProfile.email,
      tenantId: userProfile.tenant_id,
      tenantSubdomain: userProfile.tenants?.subdomain,
      onboardingComplete: !!userProfile.tenant_id
    });
    
    return NextResponse.json({
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
