import { NextRequest, NextResponse } from 'next/server';
import { validateTenantContext } from '@/lib/api-tenant-validation';
import { createClient } from '@supabase/supabase-js';
import { getCORSHeaders } from '@/lib/utils';
import { 
  generatePersonaPrompts, 
  validatePersonaSettings, 
  getDefaultPersona
} from '@/lib/persona-prompt-generator';

/**
 * GET: Fetch current AI persona for tenant
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);
  
  try {
    const tenantValidation = await validateTenantContext(request, {
      requireAuth: true
    });
    
    if (!tenantValidation.isValid) {
      return NextResponse.json(
        { error: tenantValidation.error },
        { status: tenantValidation.statusCode || 401, headers: corsHeaders }
      );
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: persona, error } = await supabase
      .from('tenant_ai_persona')
      .select('*')
      .eq('tenant_id', tenantValidation.tenantId)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to fetch persona' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    return NextResponse.json({
      persona: persona || getDefaultPersona(),
      isDefault: !persona
    }, { headers: corsHeaders });
    
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST: Create or update AI persona for tenant
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);
  
  try {
    const tenantValidation = await validateTenantContext(request, {
      requireAuth: true
    });
    
    if (!tenantValidation.isValid) {
      return NextResponse.json(
        { error: tenantValidation.error },
        { status: tenantValidation.statusCode || 401, headers: corsHeaders }
      );
    }
    
    const body = await request.json();
    const { industry, custom_instructions } = body;
    
    const validation = validatePersonaSettings({ industry, custom_instructions });
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid persona settings', details: validation.errors },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const { system_prompt, fallback_prompt } = generatePersonaPrompts({
      industry: industry || 'general',
      custom_instructions: custom_instructions || ''
    });
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data, error } = await supabase
      .from('tenant_ai_persona')
      .upsert({
        tenant_id: tenantValidation.tenantId,
        industry: industry || 'general',
        custom_instructions: custom_instructions?.trim() || null,
        system_prompt,
        fallback_prompt,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tenant_id'
      })
      .select()
      .single();
      
    if (error) {
      return NextResponse.json(
        { error: 'Failed to save persona' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      persona: data,
      message: 'AI persona updated successfully'
    }, { headers: corsHeaders });
    
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * OPTIONS: Handle CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new Response(null, {
    status: 200,
    headers: getCORSHeaders(origin),
  });
}
