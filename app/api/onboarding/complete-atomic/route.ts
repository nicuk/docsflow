import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { getCORSHeaders } from '@/lib/utils';

/**
 * 🎯 CLERK MIGRATION: Atomic onboarding completion
 * Creates tenant in Supabase DB and updates Clerk metadata
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: getCORSHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    const { subdomain, industry, businessName, responses, displayName, userRole } = await request.json();
    
    // Validate required fields
    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Clean subdomain
    const cleanSubdomain = subdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
    
    // 🎯 CLERK: Get authenticated user
    const { userId } = await auth();
    const user = await currentUser();
    
    if (!userId || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const userEmail = user.emailAddresses[0]?.emailAddress || '';

    console.log('🔄 [ONBOARDING] Starting atomic onboarding for:', {
      userId,
      email: userEmail,
      subdomain: cleanSubdomain,
      businessName: businessName || displayName,
    });

    // Initialize Supabase with service role for database operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if tenant already exists
    const { data: existingTenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('subdomain', cleanSubdomain)
      .single();

    let tenantId;
    let isNewTenant = false;

    if (existingTenant) {
      // Tenant exists - user is joining
      tenantId = existingTenant.id;
      console.log('✅ [ONBOARDING] User joining existing tenant:', tenantId);
    } else {
      // Create new tenant
      tenantId = crypto.randomUUID();
      isNewTenant = true;

      const { error: tenantError } = await supabaseAdmin
        .from('tenants')
        .insert({
          id: tenantId,
          subdomain: cleanSubdomain,
          name: businessName || displayName || cleanSubdomain,
          industry: industry || 'general'
        });

      if (tenantError) {
        if (tenantError.message?.includes('duplicate key')) {
          return NextResponse.json(
            { error: 'Subdomain already taken' },
            { status: 409, headers: corsHeaders }
          );
        }
        console.error('❌ [ONBOARDING] Tenant creation error:', tenantError);
        throw tenantError;
      }

      console.log('✅ [ONBOARDING] Created new tenant:', tenantId);
    }

    // Determine access level: first user (new tenant) = admin (level 1), others = member (level 2)
    const accessLevel = isNewTenant ? 1 : (userRole === 'admin' ? 1 : 2);
    const role = accessLevel === 1 ? 'admin' : 'member';

    // Create or update user in Supabase database
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId, // Use Clerk user ID
        email: userEmail,
        name: user.firstName || userEmail.split('@')[0],
        tenant_id: tenantId,
        role: role,
        access_level: accessLevel,
        onboarding_complete: true,
      }, {
        onConflict: 'id'
      });

    if (userError) {
      console.error('❌ [ONBOARDING] User upsert error:', userError);
      throw userError;
    }

    console.log('✅ [ONBOARDING] User created/updated:', {
      userId,
      role,
      accessLevel,
      isFirstUser: isNewTenant,
    });

    // Store onboarding responses if provided
    if (responses && Object.keys(responses).length > 0) {
      const { error: responsesError } = await supabaseAdmin
        .from('onboarding_responses')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          responses: {
            subdomain: cleanSubdomain,
            business_name: businessName || displayName || cleanSubdomain,
            industry: industry || 'technology',
            ...responses
          }
        });

      if (responsesError) {
        console.warn('⚠️ [ONBOARDING] Failed to store responses:', responsesError.message);
        // Don't fail onboarding for this
      }
    }

    // 🎯 CLERK: Update user metadata with tenant info
    await clerkClient().users.updateUserMetadata(userId, {
      publicMetadata: {
        tenantId: tenantId,
        tenantSubdomain: cleanSubdomain,
        tenantName: businessName || displayName || cleanSubdomain,
        role: role,
        accessLevel: accessLevel,
        onboardingComplete: true,
      }
    });

    console.log('✅ [ONBOARDING] Updated Clerk metadata with tenant info');

    return NextResponse.json(
      {
        success: true,
        tenant: {
          id: tenantId,
          subdomain: cleanSubdomain,
          name: businessName || displayName || cleanSubdomain,
          industry: industry || 'general'
        },
        user: {
          id: userId,
          email: userEmail,
          role: role,
          accessLevel: accessLevel,
          isFirstUser: isNewTenant,
        },
        redirectUrl: `https://${cleanSubdomain}.docsflow.app/dashboard`
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ [ONBOARDING] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Onboarding failed',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

