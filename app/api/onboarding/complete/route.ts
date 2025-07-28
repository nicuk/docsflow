import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCORSHeaders } from '@/lib/utils';

// Initialize Gemini AI for persona generation
const genAI = process.env.GOOGLE_AI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
  : null;

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
      userId 
    } = await request.json();

    if (!business_overview || !subdomain) {
      return NextResponse.json(
        { error: 'Missing required fields: business_overview, subdomain' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createServerClient();

    // Step 1: Generate LLM persona from onboarding answers
    let customPersona = null;
    
    if (genAI) {
      try {
        const personaPrompt = `
You are creating a custom AI assistant persona for a business based on their onboarding responses.

Business Overview: ${business_overview}
Daily Challenges: ${daily_challenges || 'Not specified'}
Key Decisions: ${key_decisions || 'Not specified'}
Success Metrics: ${success_metrics || 'Not specified'}
Information Needs: ${information_needs || 'Not specified'}

Create a JSON response with the following structure:
{
  "role": "Specific role title for this business",
  "tone": "Professional tone description",
  "focus_areas": ["area1", "area2", "area3"],
  "business_context": "Brief business context",
  "prompt_template": "Custom system prompt for this business",
  "industry": "${industry || 'general'}",
  "created_from": "onboarding_answers"
}

Make it specific to their business type and challenges. Be concise but comprehensive.
`;

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(personaPrompt);
        const response = result.response;
        const personaText = response.text();
        
        // Extract JSON from response
        const jsonMatch = personaText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          customPersona = JSON.parse(jsonMatch[0]);
        }
      } catch (error) {
        console.error('LLM persona generation failed:', error);
        // Continue with fallback persona
      }
    }

    // Fallback persona if LLM fails
    if (!customPersona) {
      customPersona = {
        role: `${industry === 'motorcycle_dealer' ? 'Motorcycle Dealership' : 
               industry === 'warehouse_distribution' ? 'Warehouse & Distribution' : 
               'Business'} Intelligence Assistant`,
        tone: "Professional and helpful",
        focus_areas: ["document analysis", "business insights", "decision support"],
        business_context: business_overview.substring(0, 100) + "...",
        prompt_template: `You are an AI assistant for ${businessName || 'this business'}. Focus on providing helpful, accurate information based on the user's documents and questions.`,
        industry: industry || 'general',
        created_from: "onboarding_answers_fallback"
      };
    }

    // Step 2: Create tenant in database
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        subdomain: subdomain.toLowerCase(),
        name: businessName || business_overview.substring(0, 50),
        industry: industry || 'general',
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
      redirect_url: `https://${tenant.subdomain}.docsflow.app/`,
      message: 'Onboarding completed successfully'
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Onboarding completion API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
} 