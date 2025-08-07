import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aiProvider, isRealAIAvailable } from '@/lib/ai/providers';
import { getCORSHeaders } from '@/lib/utils';

// Initialize Supabase client
function getSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// AI provider is now imported from lib/ai/providers

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: getCORSHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    const { responses, tenantAssignment } = await request.json();

    if (!responses || !tenantAssignment) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    // Map industry to allowed database values
    const mapIndustryToDbValue = (industry: string): string => {
      const industryMap: Record<string, string> = {
        'healthcare': 'general',
        'technology': 'general',
        'automotive': 'motorcycle_dealer',
        'motorcycle_dealer': 'motorcycle_dealer',
        'warehouse_distribution': 'warehouse_distribution',
        'logistics': 'warehouse_distribution',
        'manufacturing': 'warehouse_distribution',
        'retail': 'general',
        'finance': 'general',
        'education': 'general',
        'consulting': 'general'
      };
      return industryMap[industry.toLowerCase()] || 'general';
    };

    const mappedIndustry = mapIndustryToDbValue(tenantAssignment.industry);

    // Step 1: Generate LLM persona from onboarding responses using proper AI SDK
    let customPersona = null;
    
    try {
      const personaPrompt = `
You are creating a custom AI assistant persona for a business based on their onboarding responses.

Business Overview: ${responses.business_overview || 'Not provided'}
Daily Challenges: ${responses.daily_challenges || 'Not provided'}
Key Decisions: ${responses.key_decisions || 'Not provided'}
Success Metrics: ${responses.success_metrics || 'Not provided'}
Information Needs: ${responses.information_needs || 'Not provided'}

Create a JSON response with the following structure:
{
  "role": "Specific role title for this business",
  "tone": "Professional tone description",
  "focus_areas": ["area1", "area2", "area3"],
  "business_context": "Brief business context",
  "prompt_template": "Custom system prompt for this business",
  "industry": "${tenantAssignment.industry}",
  "created_from": "onboarding_answers"
}

Make it specific to their business type and challenges. Be concise but comprehensive.
`;

      // Use the proper AI provider (like working aichatbot)
      customPersona = await aiProvider.generatePersona(personaPrompt);
      
      if (isRealAIAvailable()) {
        console.log('✅ Generated persona using real Gemini AI');
      } else {
        console.log('🔄 Generated persona using fallback template');
      }
      
    } catch (error) {
      console.error('LLM persona generation failed:', error);
      // Continue with fallback persona
    }

    // Fallback persona if LLM fails
    if (!customPersona) {
      customPersona = {
        role: `${tenantAssignment.industry === 'motorcycle_dealer' ? 'Motorcycle Dealership' : 
               tenantAssignment.industry === 'warehouse_distribution' ? 'Warehouse & Distribution' : 
               'Business'} Intelligence Assistant`,
        tone: "Professional and helpful",
        focus_areas: ["document analysis", "business insights", "decision support"],
        business_context: tenantAssignment.businessType,
        prompt_template: `You are an AI assistant for ${tenantAssignment.businessType}. Focus on providing helpful, accurate information based on the user's documents and questions.`,
        industry: tenantAssignment.industry,
        created_from: "onboarding_answers_fallback"
      };
    }

    // Step 2: Create tenant in database
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        subdomain: tenantAssignment.subdomain,
        name: tenantAssignment.businessType,
        industry: mappedIndustry,
        custom_persona: customPersona,
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

    // Step 3: Create default user for the tenant
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
              email: `admin@${tenantAssignment.subdomain}.docsflow.app`,
      password: Math.random().toString(36).substring(2, 15),
      email_confirm: true,
      user_metadata: {
        tenant_id: tenant.id,
        access_level: tenantAssignment.accessLevel,
        role: 'admin'
      }
    });

    if (userError) {
      console.error('User creation error:', userError);
      // Continue without user creation for now
    }

    // Step 4: Return success response
    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        subdomain: tenant.subdomain,
        name: tenant.name,
        industry: tenant.industry,
        custom_persona: customPersona
      },
      redirect_url: `https://${tenant.subdomain}.docsflow.app/dashboard`,
      message: 'Tenant created successfully'
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Tenant creation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
} 