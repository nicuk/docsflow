import { NextRequest, NextResponse } from 'next/server';
import { validateTenantContext } from '@/lib/api-tenant-validation';
import { createClient } from '@supabase/supabase-js';
import { getCORSHeaders } from '@/lib/utils';
import { 
  generatePersonaPrompts, 
  validatePersonaSettings, 
  getDefaultPersona,
  getIndustryDefaults
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
      
    // If error and it's not "not found", return error
    if (error && error.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to fetch persona' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Return persona or default
    return NextResponse.json({
      persona: persona || getDefaultPersona(),
      isDefault: !persona
    }, { headers: corsHeaders });
    
  } catch (error) {
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
    const { 
      role, 
      tone, 
      business_context, 
      industry, 
      focus_areas, 
      custom_instructions,
      confidence_threshold 
    } = body;
    
    // Validate settings
    const validation = validatePersonaSettings({
      role,
      tone,
      business_context,
      industry,
      focus_areas
    });
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid persona settings', details: validation.errors },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Generate prompts from settings
    const { system_prompt, fallback_prompt } = generatePersonaPrompts({
      role,
      tone,
      business_context,
      industry,
      focus_areas,
      custom_instructions
    });
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Upsert persona (insert or update)
    const { data, error } = await supabase
      .from('tenant_ai_persona')
      .upsert({
        tenant_id: tenantValidation.tenantId,
        role: role?.trim(),
        tone: tone?.trim(),
        business_context: business_context?.trim() || null,
        industry: industry || 'general',
        focus_areas: focus_areas || [],
        system_prompt,
        custom_instructions: custom_instructions?.trim() || null,
        fallback_prompt,
        confidence_threshold: confidence_threshold || 0.3,
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
    
  } catch (error) {
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

