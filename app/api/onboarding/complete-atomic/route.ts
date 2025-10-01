import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { getCORSHeaders } from '@/lib/utils';
import { detectGibberish } from '@/lib/persona-prompt-generator';

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

    // 🎯 CLERK-SUPABASE INTEGRATION: Map Clerk string ID to Supabase UUID
    // Check if user already exists in Supabase (by email, since Clerk IDs aren't UUIDs)
    let supabaseUserId: string;
    
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .eq('tenant_id', tenantId)
      .single();

    if (existingUser) {
      // User already exists in this tenant
      supabaseUserId = existingUser.id;
      
      // Update existing user
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          name: user.firstName || userEmail.split('@')[0],
          role: role,
          access_level: accessLevel,
          last_login_at: new Date().toISOString(),
        })
        .eq('id', supabaseUserId);
      
      if (updateError) {
        console.error('❌ [ONBOARDING] User update error:', updateError);
        throw updateError;
      }
    } else {
      // Create new user with generated UUID
      supabaseUserId = crypto.randomUUID();
      
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: supabaseUserId,
          email: userEmail,
          name: user.firstName || userEmail.split('@')[0],
          tenant_id: tenantId,
          role: role,
          access_level: accessLevel,
        });
      
      if (insertError) {
        console.error('❌ [ONBOARDING] User insert error:', insertError);
        throw insertError;
      }
    }

    console.log('✅ [ONBOARDING] User created/updated:', {
      clerkUserId: userId,
      supabaseUserId,
      role,
      accessLevel,
      isFirstUser: isNewTenant,
    });

    // 🎯 SMART FALLBACK: Filter out gibberish responses before storing
    let cleanedResponses = responses;
    let gibberishCount = 0;
    
    if (responses && Object.keys(responses).length > 0) {
      cleanedResponses = Object.entries(responses).reduce((acc: any, [key, value]) => {
        if (typeof value === 'string' && detectGibberish(value)) {
          console.warn(`⚠️ [ONBOARDING] Gibberish detected in ${key}: "${value.substring(0, 50)}..." - filtering out`);
          gibberishCount++;
          return acc; // Skip this answer
        }
        acc[key] = value;
        return acc;
      }, {});
      
      // Log if significant gibberish detected
      if (gibberishCount > 0) {
        console.warn(`⚠️ [ONBOARDING] Filtered ${gibberishCount}/${Object.keys(responses).length} gibberish responses. Using defaults for missing data.`);
      }
      
      // Store cleaned responses
      const { error: responsesError } = await supabaseAdmin
        .from('onboarding_responses')
        .insert({
          user_id: supabaseUserId, // Use Supabase UUID, not Clerk ID
          tenant_id: tenantId,
          responses: {
            subdomain: cleanSubdomain,
            business_name: businessName || displayName || cleanSubdomain,
            industry: industry || 'technology',
            ...cleanedResponses,
            _gibberish_filtered: gibberishCount > 0, // Track if filtering occurred
            _original_response_count: Object.keys(responses).length,
            _cleaned_response_count: Object.keys(cleanedResponses).length
          }
        });

      if (responsesError) {
        console.warn('⚠️ [ONBOARDING] Failed to store responses:', responsesError.message);
        // Don't fail onboarding for this
      }
    }

    // 🎯 CLERK: Update user metadata with tenant info AND Supabase user mapping
    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        tenantId: tenantId,
        tenantSubdomain: cleanSubdomain,
        tenantName: businessName || displayName || cleanSubdomain,
        role: role,
        accessLevel: accessLevel,
        onboardingComplete: true,
        supabaseUserId: supabaseUserId, // Store mapping for future lookups
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
          supabaseUserId: supabaseUserId,
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

