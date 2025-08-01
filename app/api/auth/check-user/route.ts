import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCORSHeaders } from '@/lib/utils';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: getCORSHeaders(origin) });
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

    const supabase = createServerClient();

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
            tenant: existingUser.tenants ? {
              id: existingUser.tenants.id,
              name: existingUser.tenants.name,
              subdomain: existingUser.tenants.subdomain
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
