import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Single source of truth for authentication state
 * This endpoint can read HttpOnly cookies and return the full session
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
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
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user || userError) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        tenant: null,
        onboardingComplete: false
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
      console.error('Profile fetch error:', profileError);
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
        onboardingComplete: false
      });
    }

    // Return complete session data
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
      tenantId: userProfile.tenant_id
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
