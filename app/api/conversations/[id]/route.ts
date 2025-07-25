import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractTenantFromRequest } from '@/lib/auth-helpers';

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

// GET /api/conversations/[id] - Get conversation messages
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient();
    const tenantId = extractTenantFromRequest(request);
    const conversationId = params.id;

    // For now, use demo user ID since we don't have full auth yet
    const userId = '00000000-0000-0000-0000-000000000000';

    // Verify conversation exists and belongs to tenant
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('id, title, created_at')
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get messages for this conversation
    const { data: messages, error: msgError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('Database error:', msgError);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Format messages for frontend
    const formattedMessages = messages?.map(msg => ({
      id: msg.id,
      type: msg.role === 'user' ? 'user' : 'ai',
      content: msg.content,
      timestamp: new Date(msg.created_at),
      sources: msg.metadata?.sources || [],
      confidence: msg.metadata?.confidence || null
    })) || [];

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.created_at
      },
      messages: formattedMessages
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Get conversation messages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500, headers: corsHeaders }
    );
  }
} 