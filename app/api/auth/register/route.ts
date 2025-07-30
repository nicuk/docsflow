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
    const { email, password, tenantId, accessLevel = 3 } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createServerClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists', details: 'A user with this email address already exists.' },
        { status: 409, headers: corsHeaders }
      );
    }

    // Create user with Supabase Auth (regular signup, not admin)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          tenant_id: tenantId,
          access_level: accessLevel,
          role: 'user'
        }
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Failed to create user', details: authError.message },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create user profile in users table
    // If no tenant_id provided, leave it null - user will select/create tenant during onboarding
    const userInsertData: any = {
      id: authData.user?.id,
      email: authData.user?.email,
      access_level: accessLevel,
      role: 'user',
      created_at: new Date().toISOString()
    };
    
    // Only add tenant_id if it's a valid UUID
    if (tenantId && tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      userInsertData.tenant_id = tenantId;
    }

    const { error: profileError } = await supabase
      .from('users')
      .insert(userInsertData);

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Don't fail the request if profile creation fails
    }

    // Get user profile with tenant info (tenant may be null for new signups)
    const { data: userProfile, error: fetchProfileError } = await supabase
      .from('users')
      .select(`
        *,
        tenants (
          id,
          subdomain,
          name,
          industry,
          custom_persona
        )
      `)
      .eq('id', authData.user?.id)
      .maybeSingle();

    if (fetchProfileError) {
      console.error('Profile fetch error:', fetchProfileError);
      // Continue without profile data
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user?.id,
        email: authData.user?.email,
        access_token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token,
        tenant_id: tenantId,
        access_level: accessLevel,
        tenant: userProfile?.tenants
      },
      message: 'User registered successfully'
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
} 