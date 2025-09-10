import { NextRequest, NextResponse } from 'next/server';
import { getCORSHeaders } from '@/lib/utils';
import { validateTenantContext } from '@/lib/api-tenant-validation';
import { enhancedProvider } from '@/lib/ai/providers';

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
    const personaResponse = await enhancedProvider.generatePersona(prompt);
    
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

    // Merge with current persona to preserve important fields
    const mergedPersona = {
      ...currentPersona,
      ...generatedPersona,
      created_from: 'regenerated',
      regenerated_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      persona: mergedPersona
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
