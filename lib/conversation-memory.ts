/**
 * Conversation Memory Module
 * 
 * Provides server-side conversation history for multi-turn chat.
 * Three responsibilities:
 * 1. Load recent messages from chat_messages table
 * 2. Save new messages (user + assistant) after each exchange
 * 3. Reformulate vague follow-up queries into standalone queries
 */

import { createClient } from '@supabase/supabase-js';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const HISTORY_LIMIT = 6; // 3 turns (user + assistant)

/**
 * Load recent conversation history from the database.
 * Returns empty array if conversationId is missing or invalid.
 */
export async function loadConversationHistory(
  conversationId: string | undefined,
  tenantId: string
): Promise<ChatMessage[]> {
  if (!conversationId || conversationId.startsWith('local-')) {
    return [];
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT);

    if (error || !data) return [];

    // Reverse so oldest messages come first (DB returns newest first)
    return data.reverse().map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));
  } catch {
    return [];
  }
}

/**
 * Save a user message and assistant response to the database.
 * Fire-and-forget: errors are silently ignored so chat is never blocked.
 */
export function saveMessages(
  conversationId: string | undefined,
  tenantId: string,
  userMessage: string,
  assistantResponse: string
): void {
  if (!conversationId || conversationId.startsWith('local-')) return;

  const supabase = getSupabase();

  const messages = [
    {
      conversation_id: conversationId,
      tenant_id: tenantId,
      role: 'user',
      content: userMessage,
      metadata: {},
    },
    {
      conversation_id: conversationId,
      tenant_id: tenantId,
      role: 'assistant',
      content: assistantResponse,
      metadata: {},
    },
  ];

  supabase
    .from('chat_messages')
    .insert(messages)
    .then(({ error }) => {
      if (error) {
        // Non-critical: message persistence failed, chat still works
      }
    });

  // Update conversation timestamp
  supabase
    .from('chat_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .then(() => {});
}

// Patterns that indicate a vague follow-up needing reformulation
const VAGUE_PATTERNS = [
  /^(tell me more|elaborate|explain more|go on|continue|more details)/i,
  /^(what about|how about|and what|what else)/i,
  /^(can you (elaborate|explain|clarify|expand))/i,
  /^(show me (more|related)|give me more)/i,
  /\b(this|that|it|these|those|the above|the previous)\b/i,
];

/**
 * Detect if a query is a vague follow-up that needs reformulation.
 */
function isVagueFollowUp(query: string): boolean {
  const trimmed = query.trim();
  if (trimmed.split(/\s+/).length > 15) return false; // Long queries are specific enough
  return VAGUE_PATTERNS.some(p => p.test(trimmed));
}

/**
 * Reformulate a vague follow-up query into a standalone query
 * using conversation history. Uses a fast, cheap LLM call.
 * 
 * Falls back to original query on any error.
 */
export async function reformulateIfNeeded(
  query: string,
  history: ChatMessage[]
): Promise<{ query: string; wasReformulated: boolean }> {
  if (history.length === 0 || !isVagueFollowUp(query)) {
    return { query, wasReformulated: false };
  }

  try {
    const { OpenRouterClient, MODEL_CONFIGS } = await import('@/lib/openrouter-client');
    const client = new OpenRouterClient();

    const historyText = history
      .slice(-4) // Last 2 turns max for reformulation prompt
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.substring(0, 300)}`)
      .join('\n');

    const response = await client.generateWithFallback(
      MODEL_CONFIGS.SIMPLE,
      [
        {
          role: 'system' as const,
          content: 'Rewrite the user\'s follow-up question as a standalone question that can be understood without context. Use specific nouns and details from the conversation history. Return ONLY the rewritten question, nothing else.',
        },
        {
          role: 'user' as const,
          content: `Conversation history:\n${historyText}\n\nFollow-up question: ${query}\n\nStandalone question:`,
        },
      ],
      { max_tokens: 100, temperature: 0 }
    );

    const reformulated = response.response.trim();
    if (reformulated && reformulated.length > 5 && reformulated.length < 500) {
      return { query: reformulated, wasReformulated: true };
    }

    return { query, wasReformulated: false };
  } catch {
    return { query, wasReformulated: false };
  }
}
