import { NextRequest, NextResponse } from 'next/server';
import { getCORSHeaders } from '@/lib/utils';
import { createClient } from '@/lib/supabase-server';
import { validateTenantContext } from '@/lib/api-tenant-validation';

// SECURITY FIX: Use secure database service instead of direct service role
import { SecureDocumentService, SecureTenantService, SecureUserService } from '@/lib/secure-database';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: getCORSHeaders(origin) });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);
  
  try {
    // RLS CONTEXT: Use tenant validation instead of direct tenant lookup
    const { validateTenantContext } = await import('@/lib/api-tenant-validation');
    
    const tenantValidation = await validateTenantContext(request, {
      requireAuth: true // Enable auth validation for proper RLS context
    });

    if (!tenantValidation.isValid) {
      console.error('Tenant validation failed:', tenantValidation.error);
      return NextResponse.json(
        { 
          error: tenantValidation.error,
          security_violation: 'Invalid tenant context'
        },
        { status: tenantValidation.statusCode || 400, headers: corsHeaders }
      );
    }

    const tenantId = tenantValidation.tenantId!; // This is the UUID
    const tenantSubdomain = tenantValidation.tenantData?.subdomain || 'unknown';
    
    console.log('Fetching conversations for validated tenant:', tenantSubdomain, 'UUID:', tenantId);
    
    // SUPABASE SSR FIX: Use server client for proper authentication  
    const supabase = await createClient();
    
    // Get conversations for this tenant using the actual UUID
    const { data: conversations, error } = await supabase
      .from('chat_conversations')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        tenant_id
      `)
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Conversations fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch conversations' }, 
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { conversations: conversations || [] },
      { headers: corsHeaders }
    );
    
  } catch (error) {
    console.error('Conversations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/conversations - Create new conversation
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);
  
  try {
    // 🔒 SECURE: Validate tenant context first (this already works correctly)
    const tenantValidation = await validateTenantContext(request, {
      requireAuth: true
    });

    if (!tenantValidation.isValid) {
      return NextResponse.json(
        { 
          error: tenantValidation.error,
          security_violation: 'Invalid tenant context'
        },
        { status: tenantValidation.statusCode || 400, headers: corsHeaders }
      );
    }

    const tenantId = tenantValidation.tenantId!; // Use validated tenant UUID
    const supabaseClient = await createClient();
    
    // Get the authenticated user ID
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    const userId = user.id;
    
    const { title } = await request.json();
    
    // Create new conversation
    const { data: conversation, error } = await supabaseClient
      .from('chat_conversations')
      .insert({
        title: title || 'New Conversation',
        tenant_id: tenantId, // Use the validated tenant UUID
        user_id: userId,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Create conversation error:', error);
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.created_at
      }
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Create conversation error:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500, headers: corsHeaders }
    );
  }
} 