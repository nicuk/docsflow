-- ============================================================================
-- QUICK FIX: Temporarily disable RLS on chat_conversations
-- (Use this if the policy fix is too complex)
-- ============================================================================

-- Disable RLS on chat_conversations table
ALTER TABLE chat_conversations DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'chat_conversations';
