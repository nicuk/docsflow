import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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
    const { 
      business_overview,
      daily_challenges,
      key_decisions,
      success_metrics,
      information_needs,
      businessName, 
      industry, 
      businessType, 
      subdomain,
      email,
      password,
      userId 
    } = await request.json();

    if (!business_overview || !subdomain) {
      return NextResponse.json(
        { error: 'Missing required fields: business_overview, subdomain' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    const cleanSubdomain = subdomain.toLowerCase().trim();
    
    if (cleanSubdomain.length < 3 || cleanSubdomain.length > 63) {
      return NextResponse.json(
        { error: 'Subdomain must be between 3 and 63 characters long' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!subdomainRegex.test(cleanSubdomain)) {
      return NextResponse.json(
        { error: 'Subdomain can only contain lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check for reserved subdomains
    const reservedSubdomains = [
      'www', 'api', 'admin', 'root', 'mail', 'ftp', 'localhost', 'test',
      'staging', 'dev', 'development', 'prod', 'production', 'beta',
      'alpha', 'demo', 'docs', 'support', 'help', 'blog', 'news',
      'status', 'monitor', 'app', 'apps', 'cdn', 'static', 'assets'
    ];

    if (reservedSubdomains.includes(cleanSubdomain)) {
      return NextResponse.json(
        { error: 'This subdomain is reserved and cannot be used' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createServerClient(cookies());

    // Step 2: Check if tenant already exists
    const { data: existingTenant, error: checkError } = await supabase
      .from('tenants')
      .select('id, subdomain')
      .eq('subdomain', cleanSubdomain)
      .single();

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Subdomain already exists. Please choose a different one.' },
        { status: 409, headers: corsHeaders }
      );
    }

    // Step 3: Create tenant in database
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        subdomain: cleanSubdomain,
        name: businessName || business_overview.substring(0, 50),
        industry: industry || 'general',
        subscription_status: 'trial',
        plan_type: 'starter',
        settings: {
          businessHours: '9:00 AM - 5:00 PM',
          timezone: 'UTC',
          slaTarget: 24
        },
        theme: {
          primary: '#3B82F6',
          secondary: '#1E40AF',
          accent: '#F59E0B'
        }
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Tenant creation error:', tenantError);
      return NextResponse.json(
        { error: 'Failed to create tenant', details: tenantError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Step 4: Create admin user for the tenant
    const adminEmail = `admin@${cleanSubdomain}.docsflow.app`;
    const tempPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        tenant_id: tenant.id,
        access_level: 5, // Admin level
        role: 'admin',
        onboarding_completed: true
      }
    });

    if (authError) {
      console.error('User creation error:', authError);
      // Continue without user creation - tenant is created
    }

    // Step 5: Create user profile
    if (authUser?.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          tenant_id: tenant.id,
          email: adminEmail,
          name: businessName || 'Admin',
          role: 'admin',
          access_level: 5,
          onboarding_completed: true
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }
    }

    // Step 3: Update user with tenant association (if userId provided)
    if (userId) {
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ 
          tenant_id: tenant.id,
          onboarding_completed: true 
        })
        .eq('id', userId);

      if (userUpdateError) {
        console.error('User update error:', userUpdateError);
        // Continue without user update
      }
    }

    // Step 4: Return success response with direct dashboard redirect
    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        subdomain: tenant.subdomain,
        name: tenant.name,
        industry: tenant.industry,
        custom_persona: { created_from: 'frontend' }
      },
      // Redirect directly to tenant dashboard
      redirect_url: `https://${tenant.subdomain}.docsflow.app/dashboard`,
      message: 'Tenant created successfully. Redirecting to your dashboard.',
      admin_credentials: {
        email: adminEmail,
        password: tempPassword,
        tenant_url: `https://${tenant.subdomain}.docsflow.app/dashboard`
      }
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Onboarding completion API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
} 