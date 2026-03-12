import { NextRequest, NextResponse } from 'next/server';
import { getCORSHeaders } from '@/lib/utils';
import { validateTenantContext } from '@/lib/api-tenant-validation';
import { aiProvider } from '@/lib/ai/providers';
import { scorePersona, improvePersona } from '@/lib/persona-scoring';
import { generatePersonaPrompts } from '@/lib/persona-prompt-generator';

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCORSHeaders(request.headers.get('origin'))
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    // ❌ SKIP tenant validation since this is cross-domain call
    // The frontend sends tenantId in body instead
    const { tenantId, prompt, currentPersona } = await request.json();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`🧠 Regenerating persona for tenant: ${tenantId}`);

    // Generate new persona using AI provider
    const personaResponse = await aiProvider.generatePersona(prompt);
    
    if (!personaResponse) {
      throw new Error('Failed to generate persona');
    }

    // Parse the AI response
    let generatedPersona;
    try {
      generatedPersona = JSON.parse(personaResponse);
    } catch (parseError) {
      console.error('Failed to parse persona response:', parseError);
      throw new Error('Invalid persona format generated');
    }

    // Score the generated persona
    const businessOverview = currentPersona?.business_context || generatedPersona.business_context || '';
    const industry = currentPersona?.industry || generatedPersona.industry || 'general';
    
    const score = scorePersona(generatedPersona, businessOverview, industry);
    console.log(`📊 Generated persona quality score: ${score.overall}/10`);
    console.log(`💡 Suggestions:`, score.suggestions);
    
    // If score is below 7, improve it
    let finalPersona = generatedPersona;
    if (score.overall < 7) {
      console.log('🔧 Optimizing persona (score below 7)...');
      finalPersona = improvePersona(generatedPersona, score, businessOverview, industry);
      
      // Re-score after improvement
      const improvedScore = scorePersona(finalPersona, businessOverview, industry);
      console.log(`✅ Optimized persona score: ${improvedScore.overall}/10`);
    }
    
    // Generate system prompts: create optimized RAG prompts from persona
    const { system_prompt, fallback_prompt } = generatePersonaPrompts({
      role: finalPersona.role,
      tone: finalPersona.tone,
      business_context: finalPersona.business_context,
      industry: finalPersona.industry,
      focus_areas: finalPersona.focus_areas,
      custom_instructions: finalPersona.custom_instructions
    });

    // Merge with current persona to preserve important fields
    const mergedPersona = {
      ...currentPersona,
      ...finalPersona,
      system_prompt,
      fallback_prompt,
      quality_score: score.overall,
      optimization_suggestions: score.suggestions,
      created_from: 'regenerated',
      regenerated_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      persona: mergedPersona,
      quality: {
        score: score.overall,
        breakdown: score.breakdown,
        suggestions: score.suggestions
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ Persona regeneration error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to regenerate persona',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

