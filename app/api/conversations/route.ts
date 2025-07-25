import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractTenantFromRequest, getUserAccessLevel } from '@/lib/auth-helpers';

// CORS headers for frontend integration
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
    ? 'https://docsflow.app,https://*.docsflow.app' 
    : '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-ID, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true',
};

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

// GET /api/conversations - List user's conversations
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const tenantId = extractTenantFromRequest(request);
    
    // For now, use demo user ID since we don't have full auth yet
    const userId = '00000000-0000-0000-0000-000000000000';

    const { data: conversations, error } = await supabase
      .from('chat_conversations')
      .select('id, title, created_at, updated_at, summary')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Format conversations for frontend
    const formattedConversations = conversations?.map(conv => ({
      id: conv.id,
      title: conv.title,
      summary: conv.summary,
      messageCount: 0, // We'll get this from frontend when needed
      lastActivity: conv.updated_at,
      createdAt: conv.created_at
    })) || [];

    return NextResponse.json({
      conversations: formattedConversations
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Get conversations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/conversations - Create new conversation
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const tenantId = extractTenantFromRequest(request);
    
    // For now, use demo user ID since we don't have full auth yet
    const userId = '00000000-0000-0000-0000-000000000000';
    
    const { title } = await request.json();

    const { data: conversation, error } = await supabase
      .from('chat_conversations')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        title: title || 'New Conversation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
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