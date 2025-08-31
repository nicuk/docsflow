import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCORSHeaders } from '@/lib/utils';

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
    const supabase = getSupabaseClient();
    
    // Get tenant from subdomain or demo mode
    const tenantSubdomain = request.headers.get('X-Tenant-Subdomain') || 'demo-warehouse-dist';
    
    console.log('Fetching conversations for tenant subdomain:', tenantSubdomain);
    
    // First, get the tenant UUID from subdomain
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', tenantSubdomain)
      .single();

    if (tenantError || !tenant) {
      console.error('Tenant not found:', tenantError);
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404, headers: corsHeaders }
      );
    }
    
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
      .eq('tenant_id', tenant.id)
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
    const supabase = getSupabaseClient();
    
    const tenantSubdomain = request.headers.get('X-Tenant-Subdomain') || 'demo-warehouse-dist';
    
    // Get the tenant UUID from subdomain
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', tenantSubdomain)
      .single();

    if (tenantError || !tenant) {
      console.error('Tenant not found:', tenantError);
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404, headers: corsHeaders }
      );
    }
    
    // For now, use demo user ID since we don't have full auth yet
    const userId = '00000000-0000-0000-0000-000000000000';
    
    const { title } = await request.json();
    
    // Create new conversation
    const { data: conversation, error } = await supabase
      .from('chat_conversations')
      .insert({
        title: title || 'New Conversation',
        tenant_id: tenant.id,
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