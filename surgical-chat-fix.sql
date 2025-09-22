-- SURGICAL FIX: Just fix the conversation creation issue
-- Minimal, safe, focused solution

-- 1. Remove the conflicting ALL policy that's causing issues
DROP POLICY IF EXISTS "chat_conversations_tenant_access" ON chat_conversations;

-- 2. Verify the working policies remain
-- (Your INSERT and SELECT policies are already working)

-- 3. Quick verification - show what policies are active
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'chat_conversations'
ORDER BY cmd;

-- Expected result after this fix:
-- chat_conversations_insert_policy | INSERT | {authenticated}
-- chat_conversations_select_policy | SELECT | {authenticated}

-- That's it. Surgical. Simple. Secure.
