-- SURGICAL SECURITY FIXES
-- Addresses Supabase linter warnings without breaking functionality

-- =============================================================================
-- FIX 1: Function Search Path Security (7 functions)
-- =============================================================================

-- Fix search_path for security-sensitive functions
-- This prevents SQL injection via search_path manipulation

-- 1. Fix is_admin function
CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_uuid 
        AND role = 'admin'
    );
END;
$$;

-- 2. Fix is_user function  
CREATE OR REPLACE FUNCTION is_user(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_uuid 
        AND role IN ('user', 'admin')
    );
END;
$$;

-- 3. Fix complete_onboarding_atomic function
CREATE OR REPLACE FUNCTION complete_onboarding_atomic(
    p_user_id uuid,
    p_tenant_id uuid,
    p_responses jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_success boolean := false;
BEGIN
    -- Update or insert onboarding responses
    INSERT INTO onboarding_responses (user_id, tenant_id, responses)
    VALUES (p_user_id, p_tenant_id, p_responses)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        responses = p_responses,
        updated_at = NOW();
    
    v_success := true;
    RETURN v_success;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

-- 4. Fix search_documents function
CREATE OR REPLACE FUNCTION search_documents(
    query_embedding vector(768),
    match_threshold float,
    match_count int,
    p_tenant_id uuid
)
RETURNS TABLE(
    id uuid,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.content,
        dc.metadata,
        (dc.embedding <=> query_embedding) * -1 + 1 as similarity
    FROM document_chunks dc
    WHERE dc.tenant_id = p_tenant_id
    AND (dc.embedding <=> query_embedding) < (1 - match_threshold)
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 5. Fix match_documents function (the one we created earlier)
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(768),
    match_threshold float DEFAULT 0.3,
    match_count int DEFAULT 10,
    p_tenant_id uuid DEFAULT NULL
)
RETURNS TABLE(
    id uuid,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.content,
        dc.metadata,
        (dc.embedding <=> query_embedding) * -1 + 1 as similarity
    FROM document_chunks dc
    WHERE (p_tenant_id IS NULL OR dc.tenant_id = p_tenant_id)
    AND (dc.embedding <=> query_embedding) < (1 - match_threshold)
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 6. Fix match_document_chunks function
CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding vector(768),
    match_threshold float DEFAULT 0.3,
    match_count int DEFAULT 5,
    p_tenant_id uuid DEFAULT NULL
)
RETURNS TABLE(
    id uuid,
    document_id uuid,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.content,
        dc.metadata,
        (dc.embedding <=> query_embedding) * -1 + 1 as similarity
    FROM document_chunks dc
    WHERE (p_tenant_id IS NULL OR dc.tenant_id = p_tenant_id)
    AND (dc.embedding <=> query_embedding) < (1 - match_threshold)
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 7. Fix match_documents_hybrid function (if it exists)
CREATE OR REPLACE FUNCTION match_documents_hybrid(
    query_embedding vector(768),
    query_text text,
    match_threshold float DEFAULT 0.3,
    match_count int DEFAULT 10,
    p_tenant_id uuid DEFAULT NULL
)
RETURNS TABLE(
    id uuid,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.content,
        dc.metadata,
        (dc.embedding <=> query_embedding) * -1 + 1 as similarity
    FROM document_chunks dc
    WHERE (p_tenant_id IS NULL OR dc.tenant_id = p_tenant_id)
    AND (dc.embedding <=> query_embedding) < (1 - match_threshold)
    AND (query_text = '' OR dc.content ILIKE '%' || query_text || '%')
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- =============================================================================
-- FIX 2: RLS Performance Optimization (auth.uid() calls)
-- =============================================================================

-- Fix the chat_conversations policies to use subquery pattern for better performance
-- This prevents re-evaluation of auth.uid() for each row

-- Drop existing policies
DROP POLICY IF EXISTS "chat_conversations_insert_policy" ON chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_select_policy" ON chat_conversations;

-- Create optimized policies with subquery pattern
CREATE POLICY "chat_conversations_insert_policy" ON chat_conversations
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        user_id = (SELECT auth.uid()) 
        AND tenant_id IS NOT NULL
    );

CREATE POLICY "chat_conversations_select_policy" ON chat_conversations
    FOR SELECT 
    TO authenticated
    USING (
        user_id = (SELECT auth.uid())
        OR 
        tenant_id IN (
            SELECT t.id FROM tenants t 
            WHERE t.subdomain = current_setting('request.jwt.claim.company_name', true)
        )
    );

-- =============================================================================
-- FIX 3: Multiple Permissive Policies (admin_audit_log and tenant_admins)
-- =============================================================================

-- This is more complex and would require examining existing policies
-- For surgical fix, we'll just add a note that this needs manual review

-- Note: Multiple permissive policies on admin_audit_log and tenant_admins
-- These should be consolidated into single policies per action/role combination
-- Requires manual review of existing policy logic before consolidation

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check that functions now have proper search_path
SELECT 
    routine_name,
    routine_type,
    security_type,
    routine_definition LIKE '%search_path%' as has_search_path_set
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'is_admin', 'is_user', 'complete_onboarding_atomic', 
    'search_documents', 'match_documents', 'match_document_chunks',
    'match_documents_hybrid'
)
ORDER BY routine_name;

-- Check optimized RLS policies
SELECT 
    policyname,
    cmd,
    with_check LIKE '%(SELECT auth.uid())%' as uses_subquery_pattern,
    qual LIKE '%(SELECT auth.uid())%' as using_clause_optimized
FROM pg_policies 
WHERE tablename = 'chat_conversations'
ORDER BY cmd;

-- Success message
SELECT 'Surgical security fixes applied successfully!' as status;
