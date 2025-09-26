-- Fix RLS policy for chat_conversations table
-- The current policies are not allowing INSERT operations for authenticated users

-- First, check current policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'chat_conversations';

-- Drop the restrictive policies that are blocking INSERTs
DROP POLICY IF EXISTS "chat_conversation_access_policy" ON chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_strict_tenant_isolation" ON chat_conversations;

-- Create a proper policy that allows authenticated users to INSERT
-- but still maintains tenant isolation
CREATE POLICY "chat_conversations_tenant_access" ON chat_conversations
    FOR ALL 
    TO authenticated
    USING (
        tenant_id::text = current_setting('request.jwt.claim.tenant_id', true)
        OR 
        tenant_id IN (
            SELECT t.id 
            FROM tenants t 
            WHERE t.subdomain = current_setting('request.jwt.claim.company_name', true)
        )
        OR
        user_id = auth.uid()
    )
    WITH CHECK (
        tenant_id::text = current_setting('request.jwt.claim.tenant_id', true)
        OR 
        tenant_id IN (
            SELECT t.id 
            FROM tenants t 
            WHERE t.subdomain = current_setting('request.jwt.claim.company_name', true)
        )
        OR
        user_id = auth.uid()
    );

-- Alternative: Create a more permissive policy for INSERTs specifically
CREATE POLICY "chat_conversations_insert_policy" ON chat_conversations
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND tenant_id IS NOT NULL
    );

-- Create a separate policy for SELECT/UPDATE/DELETE with tenant isolation
CREATE POLICY "chat_conversations_select_policy" ON chat_conversations
    FOR SELECT 
    TO authenticated
    USING (
        user_id = auth.uid()
        OR 
        tenant_id IN (
            SELECT t.id 
            FROM tenants t 
            WHERE t.subdomain = current_setting('request.jwt.claim.company_name', true)
        )
    );

-- Verify policies are created
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'chat_conversations'
ORDER BY policyname;
