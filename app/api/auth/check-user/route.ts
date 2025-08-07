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

    // Get current user from Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get user data from our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        tenant_id,
        access_level,
        role,
        onboarding_complete,
        tenants (
          id,
          name,
          subdomain,
          industry,
          industry
        )
      `)
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('User data lookup error:', userError);
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get tenant data (tenants is an array from the join)
    const tenantData = userData.tenants && Array.isArray(userData.tenants) && userData.tenants.length > 0 
      ? userData.tenants[0] 
      : null;

    // Return user data with onboarding status
    return NextResponse.json({
      success: true,
      id: userData.id,
      email: userData.email,
      fullName: userData.full_name,
      tenantId: userData.tenant_id,
      accessLevel: userData.access_level,
      role: userData.role,
      onboardingComplete: userData.onboarding_complete || false,
      industry: tenantData?.industry || 'general',
      businessType: tenantData?.industry || 'general',
      tenant: tenantData ? {
        id: tenantData.id,
        name: tenantData.name,
        subdomain: tenantData.subdomain,
        industry: tenantData.industry,
        businessType: tenantData.industry
      } : null
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Check user GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    const { email, user_id, user_metadata } = await request.json();

    if (!email || !user_id) {
      return NextResponse.json(
        { error: 'Email and user_id are required' },
        { status: 400, headers: corsHeaders }
      );
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

    // Check if user exists in our users table
    let { data: existingUser, error: userLookupError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        tenant_id,
        access_level,
        role,
        tenants (
          id,
          name,
          subdomain
        )
      `)
      .eq('email', email)
      .single();

    if (userLookupError && userLookupError.code !== 'PGRST116') {
      console.error('User lookup error:', userLookupError);
      return NextResponse.json(
        { error: 'Database error during user lookup' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (existingUser) {
      // User exists, return their info
      return NextResponse.json(
        { 
          success: true, 
          user: {
            id: existingUser.id,
            email: existingUser.email,
            full_name: existingUser.full_name,
            tenant_id: existingUser.tenant_id,
            access_level: existingUser.access_level,
            role: existingUser.role,
            tenant: existingUser.tenants && existingUser.tenants.length > 0 ? {
              id: existingUser.tenants[0].id,
              name: existingUser.tenants[0].name,
              subdomain: existingUser.tenants[0].subdomain
            } : null
          }
        },
        { status: 200, headers: corsHeaders }
      );
    } else {
      // New user from OAuth, create profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: user_id,
          email: email,
          full_name: user_metadata?.full_name || user_metadata?.name || email.split('@')[0],
          avatar_url: user_metadata?.picture || user_metadata?.avatar_url,
          provider: 'google',
          google_id: user_metadata?.sub || user_metadata?.id,
          tenant_id: null, // Will be set during onboarding
          access_level: 3, // Default access level
          role: 'user',
          created_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Continue anyway, user might have been created by another process
      }

      return NextResponse.json(
        { 
          success: true, 
          user: {
            id: user_id,
            email: email,
            full_name: user_metadata?.full_name || user_metadata?.name || email.split('@')[0],
            tenant_id: null,
            access_level: 3,
            role: 'user',
            tenant: null
          },
          isNewUser: true
        },
        { status: 200, headers: corsHeaders }
      );
    }

  } catch (error: any) {
    console.error('Check user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
