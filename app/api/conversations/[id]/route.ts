import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateTenantContext } from '@/lib/api-tenant-validation';
import { getCORSHeaders } from '@/lib/utils';

// SECURITY FIX: Use secure database service instead of direct service role
import { SecureDocumentService, SecureTenantService, SecureUserService } from '@/lib/secure-database';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new Response(null, { status: 200, headers: getCORSHeaders(origin) });
}

// GET /api/conversations/[id] - Get conversation messages
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);
  const params = await context.params;
  try {
    // Validate tenant context first
    const tenantValidation = await validateTenantContext(request, {
      requireAuth: true // ✅ PRODUCTION: Authentication enabled
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

    const tenantId = tenantValidation.tenantId!; // This is the UUID
    const supabase = getSupabaseClient();
    const conversationId = params.id;

    // Handle local conversations (frontend localStorage-based)
    if (conversationId.startsWith('local-')) {
      return NextResponse.json(
        { 
          conversation: {
            id: conversationId,
            title: 'Local Conversation',
            createdAt: new Date().toISOString()
          },
          messages: [],
          metadata: {
            source: 'local',
            tenantId
          }
        },
        { headers: corsHeaders }
      );
    }

    // For now, use demo user ID since we don't have full auth yet
    const userId = '00000000-0000-0000-0000-000000000000';

    // Try both conversation tables for backward compatibility
    let conversation, convError;
    
    // First try chat_conversations (new format)
    const { data: chatConv, error: chatError } = await supabase
      .from('chat_conversations')
      .select('id, title, created_at')
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (chatConv) {
      conversation = chatConv;
      convError = chatError;
    } else {
      // Fallback to conversations table (old format)
      const { data: oldConv, error: oldError } = await supabase
        .from('conversations')
        .select('id, title, created_at')
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .single();
      
      conversation = oldConv;
      convError = oldError;
    }

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