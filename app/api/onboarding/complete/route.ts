import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
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
    console.log('🔍 DEBUG: Received request body:', JSON.stringify(requestBody, null, 2));
    
    const { responses = {}, tenantAssignment = {} } = requestBody;
    
    // Extract from the actual frontend structure with defensive checks
    const business_overview = responses.business_overview || '';
    const daily_challenges = responses.daily_challenges || '';
    const key_decisions = responses.key_decisions || '';
    const success_metrics = responses.success_metrics || '';
    const information_needs = responses.information_needs || '';
    const businessName = tenantAssignment.companyName || tenantAssignment.businessType || '';
    const industry = tenantAssignment.industry || 'technology';
    const subdomain = tenantAssignment.subdomain || '';
    
    console.log('🔍 DEBUG: Extracted data:', {
      business_overview: business_overview.substring(0, 50) + '...',
      subdomain,
      businessName,
      industry
    });

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
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get user data from authentication
    const userId = user?.id;
    const email = user?.email;

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

    // Step 3: Create tenant in database using service role to bypass RLS
    console.log('🔍 DEBUG: Service role key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('🔍 DEBUG: Service role key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);
    console.log('🔍 DEBUG: Service role key prefix:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) || 'MISSING');
    console.log('🔍 DEBUG: All env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    
    // CRITICAL: Verify we're actually using service role
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error('❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing!');
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    const adminSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey, // Use service role key
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
      return NextResponse.json(
        { error: 'Failed to create tenant', details: tenantError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Step 4: FIXED - Link the REAL user as tenant admin (no fake admin creation)
    if (userId && email) {
      // Update the real user to be the tenant admin
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ 
          tenant_id: tenant.id,
          role: 'admin',
          access_level: 5, // Admin level
          onboarding_complete: true 
        })
        .eq('id', userId);

      if (userUpdateError) {
        console.error('Real user update error:', userUpdateError);
        return NextResponse.json(
          { error: 'Failed to assign admin role to user', details: userUpdateError.message },
          { status: 500, headers: corsHeaders }
        );
      }

      // Also update auth user metadata
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          tenant_id: tenant.id,
          access_level: 5,
          role: 'admin',
          onboarding_complete: true
        }
      });

      if (authUpdateError) {
        console.error('Auth metadata update error:', authUpdateError);
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
    let customPersona = null;
    try {
      const { aiProvider } = await import('@/lib/ai/providers');
      
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
      
      // Generate custom LLM persona
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
      
      // Call AI provider with timeout
      const personaResponse = await Promise.race([
        aiProvider.generatePersona(personaPrompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Persona creation timeout')), 25000)
        )
      ]);
      
      // Parse AI response
      try {
        customPersona = JSON.parse(personaResponse as string);
        customPersona.created_from = 'ai_generated';
        customPersona.created_at = new Date().toISOString();
        
        console.log('✅ LLM persona created successfully:', customPersona.role);
      } catch (parseError) {
        console.error('❌ Failed to parse AI persona response:', parseError);
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
    
    // Step 8: Update tenant with custom persona
    const { error: personaUpdateError } = await supabase
      .from('tenants')
      .update({ custom_persona: customPersona })
      .eq('id', tenant.id);
      
    if (personaUpdateError) {
      console.error('❌ Failed to save persona to tenant:', personaUpdateError);
    } else {
      console.log('✅ Custom persona saved to tenant:', tenant.subdomain);
    }

    // Step 9: Return success response with complete session data for frontend storage
    const response = NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        subdomain: tenant.subdomain,
        name: tenant.name,
        industry: tenant.industry,
        custom_persona: customPersona
      },
      // CRITICAL: Include REAL user session data for frontend storage
      user: {
        userId: userId,
        email: email, // Use the REAL user email, not fake admin email
        name: businessName || 'Admin',
        tenant_id: tenant.subdomain, // Use subdomain as tenant_id for frontend
        access_level: 5,
        onboarding_complete: true
      },
      // Redirect directly to tenant dashboard
      redirect_url: `https://${tenant.subdomain}.docsflow.app/dashboard`,
      message: 'Tenant created successfully. You are now the admin. Redirecting to your dashboard.'
    }, { headers: corsHeaders });

    // CRITICAL: Set session cookies for immediate dashboard access
    response.cookies.set('user-email', email, { // Use REAL user email 
      path: '/', 
      maxAge: 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    response.cookies.set('user-name', businessName || 'Admin', { 
      path: '/', 
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    response.cookies.set('tenant-id', tenant.subdomain, { 
      path: '/', 
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    response.cookies.set('onboarding-complete', 'true', { 
      path: '/', 
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return response;

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