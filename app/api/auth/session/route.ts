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
    
    if (!isVercelBot) {
      // DEBUGGING: Log all available cookies (only for real users)
      const allCookies = cookieStore.getAll();
      console.log(`🔍 [SESSION API] Available cookies: ${allCookies.map(c => c.name).join(', ')}`);
      console.log(`🔍 [SESSION API] access_token present: ${!!cookieStore.get('access_token')?.value}`);
      console.log(`🔍 [SESSION API] refresh_token present: ${!!cookieStore.get('refresh_token')?.value}`);
      console.log(`🔍 [SESSION API] sb-auth present: ${!!cookieStore.get('sb-lhcopwwiqwjpzbdnjovo-auth-token')?.value}`);
    }
    
    // ARCHITECTURAL ROOT FIX: Create Supabase client that reads STANDARDIZED cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // Return both standardized AND Supabase default cookies for compatibility
            const allCookies = cookieStore.getAll();
            const standardizedCookies = [];
            
            // Map our standardized cookies to Supabase expected names
            const accessToken = cookieStore.get('access_token')?.value;
            const refreshToken = cookieStore.get('refresh_token')?.value;
            
            if (accessToken) {
              standardizedCookies.push({
                name: `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`,
                value: accessToken
              });
            }
            
            if (refreshToken) {
              standardizedCookies.push({
                name: `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token-code-verifier`,
                value: refreshToken
              });
            }
            
            return [...allCookies, ...standardizedCookies];
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
