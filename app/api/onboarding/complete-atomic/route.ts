import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { getCORSHeaders } from '@/lib/utils';
import { verifiedPrimaryEmail } from '@/lib/server-auth';
import { detectGibberish, generatePersonaPrompts, INDUSTRY_PRESETS } from '@/lib/persona-prompt-generator';

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
    // `userRole` may still arrive from older clients; it is deliberately ignored.
    // A role is never chosen by the caller: the creator of a new tenant is its
    // admin, and anyone else joins through an invitation, which carries the role.
    const { subdomain, industry, businessName, responses, displayName } = await request.json();
    
    // Validate required fields
    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Clean subdomain
    const cleanSubdomain = subdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
    
    // Get authenticated user
    const { userId } = await auth();
    const user = await currentUser();
    
    if (!userId || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Membership below is matched by email, so it must be an address the caller
    // has proven they own: the verified primary one, not emailAddresses[0].
    const userEmail = verifiedPrimaryEmail(user);
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Verify your email address before setting up a workspace' },
        { status: 403, headers: corsHeaders }
      );
    }

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

    // Existing membership of this tenant, if any. Looked up before anything is
    // written so an existing tenant can only be re-entered by its own members.
    let existingMember: { id: string; role: string | null; access_level: number | null } | null = null;

    if (existingTenant) {
      tenantId = existingTenant.id;
      const { data: member } = await supabaseAdmin
        .from('users')
        .select('id, role, access_level')
        .eq('email', userEmail)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (!member) {
        // Joining someone else's tenant goes through /api/invitations, never here.
        return NextResponse.json(
          { error: 'Subdomain already taken. Ask an admin of this workspace to invite you.' },
          { status: 409, headers: corsHeaders }
        );
      }
      existingMember = member;
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
        throw tenantError;
      }
    }

    // The creator of a new tenant is its admin. A returning member keeps the
    // role they already have; re-running onboarding never changes it.
    const accessLevel = isNewTenant ? 1 : (existingMember?.access_level ?? 2);
    const role = isNewTenant ? 'admin' : (existingMember?.role ?? 'member');

    // Map Clerk string ID to Supabase UUID
    // Check if user already exists in Supabase (by email, since Clerk IDs aren't UUIDs)
    let supabaseUserId: string;
    
    const existingUser = existingMember;

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
        throw insertError;
      }
    }

    // Filter out gibberish responses before storing
    let cleanedResponses = responses;
    let gibberishCount = 0;
    
    if (responses && Object.keys(responses).length > 0) {
      cleanedResponses = Object.entries(responses).reduce((acc: any, [key, value]) => {
        if (typeof value === 'string' && detectGibberish(value)) {
          gibberishCount++;
          return acc; // Skip this answer
        }
        acc[key] = value;
        return acc;
      }, {});
      
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
        // Don't fail onboarding for this
      }
    }

    // Create AI persona for new tenants with detected industry
    if (isNewTenant) {
      const detectedIndustry = industry || 'general';
      const preset = INDUSTRY_PRESETS[detectedIndustry] || INDUSTRY_PRESETS.general;
      const { system_prompt, fallback_prompt } = generatePersonaPrompts({
        industry: detectedIndustry,
        custom_instructions: preset.default_instructions
      });

      await supabaseAdmin
        .from('tenant_ai_persona')
        .upsert({
          tenant_id: tenantId,
          industry: detectedIndustry,
          custom_instructions: preset.default_instructions,
          system_prompt,
          fallback_prompt,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id' });
    }

    // Update user metadata with tenant info and Supabase user mapping
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
    console.error('Onboarding failed:', error);
    return NextResponse.json(
      // Internal error details stay in the server log, not in the response.
      { error: 'Onboarding failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}

