-- ============================================================================
-- FIX: RLS Policy for chat_conversations table
-- ============================================================================

-- Check current RLS policies on chat_conversations
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'chat_conversations';

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'chat_conversations';

-- Create or update the RLS policy to allow tenant-specific access
CREATE POLICY IF NOT EXISTS "chat_conversations_tenant_isolation" 
ON chat_conversations 
FOR ALL 
USING (
  tenant_id IN (
    SELECT id FROM tenants 
    WHERE subdomain = split_part(current_setting('request.headers', true)::json->>'x-tenant-subdomain', '.', 1)
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT id FROM tenants 
    WHERE subdomain = split_part(current_setting('request.headers', true)::json->>'x-tenant-subdomain', '.', 1)
  )
);

-- Alternative simpler policy if the above doesn't work
CREATE POLICY IF NOT EXISTS "chat_conversations_allow_authenticated" 
ON chat_conversations 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Check what policies exist after creation
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'chat_conversations';
