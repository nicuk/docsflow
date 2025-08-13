import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { extractCompanyName } from '@/lib/industry-detection';
import { createResponseWithSessionCookies } from '@/lib/cookie-utils';
import { Redis } from '@upstash/redis';
import { verifyTenantAdmin, logAdminAction } from '@/lib/auth/admin-verification';
import { getCORSHeaders } from '@/lib/utils';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: getCORSHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    const requestBody = await request.json();
    const { responses = {}, tenantAssignment = {} } = requestBody;
    
    // Debug: Log the actual request structure to understand data mapping
    console.log('📋 Request data structure:', {
      responses: Object.keys(responses),
      tenantAssignment: tenantAssignment,
      fullRequestBody: requestBody
    });
    
    // Extract from the actual frontend structure with defensive checks
    const business_overview = responses.business_overview || '';
    const daily_challenges = responses.daily_challenges || '';
    const key_decisions = responses.key_decisions || '';
    const success_metrics = responses.success_metrics || '';
    const information_needs = responses.information_needs || '';
    
    const industry = tenantAssignment.industry || responses.industry || 'technology';
    const subdomain = tenantAssignment.subdomain || '';
    
    // Fix: Check multiple possible business name fields from frontend
    const businessNameFromFrontend = tenantAssignment.companyName || 
                                    tenantAssignment.businessName || 
                                    tenantAssignment.businessType || 
                                    tenantAssignment.name ||
                                    responses.company_name ||
                                    responses.business_name ||
                                    '';
    
    // Validate subdomain format first
    const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    const cleanSubdomain = subdomain.toLowerCase().trim();
    
    // Use enhanced business name extraction with fallback
    const businessName = businessNameFromFrontend || extractCompanyName(business_overview, cleanSubdomain);
    
    console.log('📊 Extracted data:', {
      businessName,
      industry,
      subdomain,
      cleanSubdomain
    });

    if (!business_overview || !subdomain) {
      return NextResponse.json(
        { error: 'Missing required fields: business_overview, subdomain' },
        { status: 400, headers: corsHeaders }
      );
    }
    
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

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: Array<{name: string, value: string, options?: any}>) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    );

    // Get current authenticated user (auth was already working)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('🔐 Authentication check:', { 
      hasUser: !!user, 
      authError: authError?.message,
      userEmail: user?.email,
      userId: user?.id 
    });
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Authentication required', details: authError?.message },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Get user data from authentication
    const userId = user?.id;
    const email = user?.email;
    
    // Log user information for debugging
    console.log(`👤 User info:`, { userId, email });

    // Step 2: Check if tenant already exists and user's relationship to it
    const { data: existingTenant, error: checkError } = await supabase
      .from('tenants')
      .select('id, subdomain')
      .eq('subdomain', cleanSubdomain)
      .single();

    // Handle errors in tenant existence check
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is 'Record not found' which is expected
      console.error('Tenant existence check error:', checkError);
      return NextResponse.json(
        { error: 'Failed to check tenant existence', details: checkError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    if (existingTenant) {
      // Use secure dual verification to check if user is admin of this tenant
      console.log(`🔐 Checking admin status for existing tenant: ${cleanSubdomain}`);
      
      let adminVerification;
      try {
        adminVerification = await verifyTenantAdmin(userId!, existingTenant.id);
        console.log(`🔍 Admin verification result:`, {
          isAdmin: adminVerification.isAdmin,
          method: adminVerification.verificationMethod,
          hasErrors: adminVerification.details.errors?.length > 0
        });
      } catch (verificationError) {
        console.error(`❌ Admin verification failed with exception:`, verificationError);
        console.error(`🔍 Verification error type:`, verificationError?.constructor?.name);
        console.error(`📝 Verification error message:`, verificationError?.message);
        
        // Fallback to deny access when verification fails
        return NextResponse.json(
          { error: 'Unable to verify admin status. Please try again or contact support.' },
          { status: 500, headers: corsHeaders }
        );
      }
      
      // Log detailed verification result for debugging
      console.log(`🔍 Detailed admin verification result:`, JSON.stringify(adminVerification, null, 2));
      
      if (adminVerification.isAdmin && adminVerification.verificationMethod === 'dual') {
        // User is verified admin of this tenant - complete onboarding
        console.log(`✅ User ${email} is verified admin of tenant ${cleanSubdomain} - completing onboarding`);
        console.log(`🔒 Verification method: ${adminVerification.verificationMethod}, Access level: ${adminVerification.accessLevel}`);
        
        // Log admin action for audit trail
        await logAdminAction(userId!, existingTenant.id, 'onboarding_completion_existing_tenant', {
          subdomain: cleanSubdomain,
          verification_method: adminVerification.verificationMethod
        });
        
        // Update user metadata to mark onboarding complete
        const { error: authUpdateError } = await supabase.auth.admin.updateUserById(userId, {
          user_metadata: {
            tenant_id: existingTenant.id,
            access_level: 5,
            role: 'admin',
            onboarding_complete: true
          }
        });

        return NextResponse.json({
          success: true,
          tenant: existingTenant,
          message: 'Onboarding completed for existing tenant'
        }, { headers: corsHeaders });
      } else {
        // User is not admin - they need an invitation
        console.log(`❌ User ${email} is not admin of existing tenant ${cleanSubdomain}`);
        console.log(`🔒 Verification details:`, {
          method: adminVerification.verificationMethod,
          errors: adminVerification.details.errors
        });
        
        // Log failed admin verification attempt for security monitoring
        await logAdminAction(userId!, existingTenant.id, 'onboarding_attempt_non_admin', {
          subdomain: cleanSubdomain,
          verification_method: adminVerification.verificationMethod,
          errors: adminVerification.details.errors
        });
        
        return NextResponse.json(
          { error: 'Subdomain already exists. You need an invitation from the admin to join this tenant.' },
          { status: 409, headers: corsHeaders }
        );
      }
    }

    // Step 3: Create tenant in database using service role to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error('❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing!');
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Log service role key status for debugging (without exposing the actual key)
    console.log(`🔑 Service role key configured: ${!!serviceRoleKey}`);
    
    // CRITICAL FIX: Use createClient for service role operations (no cookies)
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey // Direct service role authentication
    );

    const { data: tenant, error: tenantError } = await adminSupabase
      .from('tenants')
      .insert({
        subdomain: cleanSubdomain,
        name: businessName || cleanSubdomain, // Use subdomain as fallback, not business_overview
        industry: industry === 'healthcare' ? 'general' : (industry || 'general'),
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
      
      // Handle specific constraint violation for duplicate subdomain
      if (tenantError.code === '23505' && tenantError.message?.includes('tenants_subdomain_key')) {
        return NextResponse.json(
          { error: 'Subdomain already exists. You need an invitation from the admin to join this tenant.' },
          { status: 409, headers: corsHeaders }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create tenant', details: tenantError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Step 4: FIXED - Link the REAL user as tenant admin (no fake admin creation)
    if (userId && email) {
      console.log('🔄 Starting user admin assignment:', { 
        userId, 
        email, 
        tenantId: tenant.id, 
        tenantSubdomain: tenant.subdomain 
      });

      // First, check current user state
      const { data: currentUser, error: getCurrentError } = await adminSupabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('📋 Current user state before update:', {
        currentUser,
        getCurrentError: getCurrentError?.message
      });

      // Update the real user to be the tenant admin using service role
      const { data: updatedUser, error: userUpdateError } = await adminSupabase
        .from('users')
        .update({ 
          tenant_id: tenant.id,
          role: 'admin',
          access_level: 5 // Admin level
          // onboarding_complete tracked in user_metadata instead
        })
        .eq('id', userId)
        .select()
        .single();

      console.log('✅ User update result:', {
        updatedUser,
        userUpdateError: userUpdateError?.message,
        success: !userUpdateError
      });

      if (userUpdateError) {
        console.error('❌ Real user update error:', userUpdateError);
        return NextResponse.json(
          { error: 'Failed to assign admin role to user', details: userUpdateError.message },
          { status: 500, headers: corsHeaders }
        );
      }

      console.log('🔐 Updating auth metadata for user:', userId);

      // Also update auth user metadata using service role
      const { data: authUpdateData, error: authUpdateError } = await adminSupabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          tenant_id: tenant.id,
          access_level: 5,
          role: 'admin',
          onboarding_complete: true
        }
      });

      console.log('🔐 Auth metadata update result:', {
        authUpdateData: authUpdateData?.user?.user_metadata,
        authUpdateError: authUpdateError?.message,
        success: !authUpdateError
      });

      if (authUpdateError) {
        console.error('❌ Auth metadata update error:', authUpdateError);
        // Continue - not critical
      }

      console.log(`✅ Real user ${email} assigned as admin for tenant ${tenant.subdomain}`);
    } else {
      console.error('❌ No userId or email provided - cannot assign admin role');
      return NextResponse.json(
        { error: 'User identification required for tenant creation' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Step 6: CRITICAL FIX - Update Redis cache for middleware
    try {
      const redis = (await import('@/lib/redis')).redis;
      if (redis) {
        // Cache tenant data for middleware lookup
        await redis.setex(`tenant:${tenant.subdomain}`, 3600, JSON.stringify({
          id: tenant.id,
          subdomain: tenant.subdomain,
          name: tenant.name,
          industry: tenant.industry,
          subscription_status: 'trial'
        })); // Cache for 1 hour
        
        // Also cache subdomain existence for quick checks
        await redis.setex(`subdomain:${tenant.subdomain}`, 3600, 'exists');
        
        console.log(`✅ Redis cache updated for tenant: ${tenant.subdomain}`);
      }
    } catch (redisError) {
      console.error('Redis cache update failed:', redisError);
      // Continue without Redis - not critical for functionality
    }

    // Step 7: Create real LLM persona using the business context
    console.log('🤖 STEP 7: Starting LLM persona generation...');
    let customPersona = null;
    try {
      console.log('🔄 Importing AI provider...');
      const { aiProvider } = await import('@/lib/ai/providers');
      console.log('✅ AI provider imported successfully');
      
      // Create comprehensive business context for LLM
      const businessContext = {
        business_overview,
        daily_challenges,
        key_decisions,
        success_metrics,
        information_needs,
        industry: tenant.industry,
        businessName: tenant.name
      };
      console.log('📋 Business context prepared:', {
        industry: tenant.industry,
        businessName: tenant.name,
        hasOverview: !!business_overview,
        hasChallenges: !!daily_challenges
      });
      
      // Generate custom LLM persona
      console.log('🎯 Creating persona prompt...');
      const personaPrompt = `Create a specialized AI assistant persona for this business:

Business: ${tenant.name}
Industry: ${tenant.industry}
Overview: ${business_overview}
Daily Challenges: ${daily_challenges}
Key Decisions: ${key_decisions}
Success Metrics: ${success_metrics}
Information Needs: ${information_needs}

Create a JSON response with:
- role: Professional role/title for the AI
- focus_areas: Array of 3-5 key expertise areas
- tone: Communication style (professional, friendly, technical, etc.)
- business_context: Summary of business understanding
- prompt_template: System prompt for chat interactions`;
      
      console.log('🤖 Creating LLM persona for:', tenant.name);
      console.log('📝 Prompt length:', personaPrompt.length, 'characters');
      
      // Check AI provider type
      console.log('🔍 AI provider type check...');
      console.log('🔑 GOOGLE_GENERATIVE_AI_API_KEY exists:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);
      console.log('🧪 Test environment:', Boolean(process.env.NODE_ENV === 'test'));
      
      // Call AI provider with timeout
      console.log('🚀 Calling aiProvider.generatePersona...');
      const startTime = Date.now();
      const personaResponse = await Promise.race([
        aiProvider.generatePersona(personaPrompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Persona creation timeout')), 25000)
        )
      ]);
      const endTime = Date.now();
      console.log(`⏱️ AI generation completed in ${endTime - startTime}ms`);
      console.log('📤 AI response type:', typeof personaResponse);
      console.log('📤 AI response length:', personaResponse?.toString().length || 0);
      
      // Parse AI response
      try {
        console.log('🔄 Parsing AI response as JSON...');
        customPersona = JSON.parse(personaResponse as string);
        customPersona.created_from = 'ai_generated';
        customPersona.created_at = new Date().toISOString();
        
        console.log('✅ LLM persona created successfully:', customPersona.role);
        console.log('📊 Persona focus areas:', customPersona.focus_areas);
      } catch (parseError) {
        console.error('❌ Failed to parse AI persona response:', parseError);
        console.error('📄 Raw AI response:', personaResponse?.toString().substring(0, 200) + '...');
        // Fallback persona
        customPersona = {
          role: `${tenant.industry} Business Advisor`,
          focus_areas: ['Operations', 'Strategy', 'Growth'],
          tone: 'professional',
          business_context: business_overview,
          prompt_template: `You are a specialized ${tenant.industry} business advisor for ${tenant.name}.`,
          created_from: 'fallback',
          created_at: new Date().toISOString()
        };
      }
      
    } catch (error) {
      console.error('❌ LLM persona creation failed:', error);
      console.error('🔍 Error type:', error?.constructor?.name);
      console.error('📝 Error message:', error?.message);
      console.error('🔗 Error stack:', error?.stack?.substring(0, 500));
      console.error('🌍 Environment check:', {
        NODE_ENV: process.env.NODE_ENV,
        hasGoogleKey: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        keyLength: process.env.GOOGLE_GENERATIVE_AI_API_KEY?.length || 0
      });
      console.log('🔄 Using fallback persona due to error...');
      
      // Fallback persona
      customPersona = {
        role: `${tenant.industry} Business Advisor`,
        focus_areas: ['Operations', 'Strategy', 'Growth'],
        tone: 'professional',
        business_context: business_overview,
        prompt_template: `You are a specialized ${tenant.industry} business advisor for ${tenant.name}.`,
        created_from: 'fallback',
        created_at: new Date().toISOString()
      };
    }
    
    // Step 8: Update tenant with custom persona using service role
    const { error: personaUpdateError } = await adminSupabase
      .from('tenants')
      .update({ custom_persona: customPersona })
      .eq('id', tenant.id);
      
    if (personaUpdateError) {
      console.error('❌ Failed to save persona to tenant:', personaUpdateError);
    } else {
      console.log('✅ Custom persona saved to tenant:', tenant.subdomain);
    }

    // Step 8.5: Refresh user session to prevent token invalidation after admin role assignment
    try {
      const { data: refreshedSession, error: refreshError } = await adminSupabase.auth.refreshSession();
      if (refreshError) {
        console.warn('⚠️ Session refresh failed (non-critical):', refreshError);
      } else {
        console.log('✅ User session refreshed after admin assignment');
      }
    } catch (refreshErr) {
      console.warn('⚠️ Session refresh attempt failed (non-critical):', refreshErr);
    }

    // Step 9: Return success response with session cookies using proper Set-Cookie headers
    const response = createResponseWithSessionCookies({
      success: true,
      tenant: {
        id: tenant.id,
        subdomain: tenant.subdomain,
        displayName: businessName || tenant.display_name || 'Your Business'
      },
      redirect: `https://${tenant.subdomain}.docsflow.app/dashboard`
    }, {
      userEmail: email, // Use REAL user email
      userName: businessName || 'Admin',
      tenantId: tenant.subdomain,
      onboardingComplete: true
    });

  } catch (error) {
    console.error('❌ Onboarding completion error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500, headers: corsHeaders }
    );
  }
}