import { NextRequest, NextResponse } from 'next/server';
import { getCORSHeaders } from '@/lib/utils';
import { validateTenantContext } from '@/lib/api-tenant-validation';
import { aiProvider } from '@/lib/ai/providers';
import { generatePersonaPrompts, INDUSTRY_PRESETS } from '@/lib/persona-prompt-generator';

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
    const { tenantId, currentPersona } = await request.json();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const industry = currentPersona?.industry || 'general';
    const preset = INDUSTRY_PRESETS[industry] || INDUSTRY_PRESETS.general;

    const prompt = `Generate custom AI assistant instructions for a ${preset.label} business.
The assistant helps users query their uploaded documents and get source-attributed answers.

Current instructions: ${currentPersona?.custom_instructions || preset.default_instructions}

Generate improved, more specific instructions (1-3 paragraphs, under 500 words).
Return ONLY the instruction text, no JSON or formatting.
Focus on: what the assistant should prioritize, how it should respond, and what domain expertise it should emphasize.`;

    const generatedText = await aiProvider.generatePersona(prompt);

    if (!generatedText) {
      throw new Error('Failed to generate instructions');
    }

    const newPersona = {
      industry,
      custom_instructions: generatedText.trim()
    };

    const { system_prompt, fallback_prompt } = generatePersonaPrompts(newPersona);

    return NextResponse.json({
      success: true,
      persona: {
        ...newPersona,
        system_prompt,
        fallback_prompt,
        created_from: 'regenerated',
        regenerated_at: new Date().toISOString()
      }
    }, { headers: corsHeaders });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to regenerate persona',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
