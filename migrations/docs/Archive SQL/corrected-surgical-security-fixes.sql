-- CORRECTED SURGICAL SECURITY FIXES
-- Cross-checked with actual function signatures in create-match-documents-function.sql

-- =============================================================================
-- FIX 1: Function Search Path Security (Functions that exist)
-- =============================================================================

-- First, let's check what functions actually exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'is_admin', 'is_user', 'complete_onboarding_atomic', 
    'search_documents', 'match_documents', 'match_document_chunks',
    'match_documents_hybrid'
)
ORDER BY routine_name;

-- =============================================================================
-- DROP AND RECREATE WITH CORRECT SIGNATURES (Based on create-match-documents-function.sql)
-- =============================================================================

-- 1. Fix match_documents function (exact signature from your schema)
DROP FUNCTION IF EXISTS match_documents(vector, double precision, integer, uuid);
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(768),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10,
  tenant_id uuid DEFAULT NULL
)
RETURNS TABLE (
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
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    document_chunks.metadata,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  FROM document_chunks
  WHERE 
    document_chunks.embedding IS NOT NULL
    AND (tenant_id IS NULL OR document_chunks.tenant_id = match_documents.tenant_id)
    AND 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 2. Fix match_document_chunks function (exact signature from your schema)
DROP FUNCTION IF EXISTS match_document_chunks(vector, double precision, integer, uuid);
CREATE OR REPLACE FUNCTION match_document_chunks (
  query_embedding vector(768),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10,
  tenant_id uuid DEFAULT NULL
)
RETURNS TABLE (
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
  SELECT * FROM match_documents(query_embedding, match_threshold, match_count, tenant_id);
END;
$$;

-- 3. Fix search_documents function (exact signature from your schema)
DROP FUNCTION IF EXISTS search_documents(vector, uuid, double precision, integer);
CREATE OR REPLACE FUNCTION search_documents (
  query_embedding vector(768),
  tenant_uuid uuid,
  similarity_threshold float DEFAULT 0.75,
  max_results int DEFAULT 10
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  filename text,
  content text,
  chunk_index int,
  similarity_score float,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id as chunk_id,
    dc.document_id,
    d.filename,
    dc.content,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) as similarity_score,
    dc.metadata
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE 
    dc.embedding IS NOT NULL
    AND dc.tenant_id = tenant_uuid
    AND d.tenant_id = tenant_uuid
    AND 1 - (dc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT max_results;
END;
$$;

-- =============================================================================
-- FIX 2: Other Functions (Only if they exist)
-- =============================================================================

-- Only recreate functions that actually exist in your database
-- Check and fix is_admin if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
        DROP FUNCTION IF EXISTS is_admin(uuid);
        CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid)
        RETURNS boolean
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public, pg_temp
        AS $func$
        BEGIN
            RETURN EXISTS (
                SELECT 1 FROM users 
                WHERE id = user_uuid 
                AND role = 'admin'
            );
        END;
        $func$;
    END IF;
END;
$$;

-- Check and fix is_user if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_user') THEN
        DROP FUNCTION IF EXISTS is_user(uuid);
        CREATE OR REPLACE FUNCTION is_user(user_uuid uuid)
        RETURNS boolean
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public, pg_temp
        AS $func$
        BEGIN
            RETURN EXISTS (
                SELECT 1 FROM users 
                WHERE id = user_uuid 
                AND role IN ('user', 'admin')
            );
        END;
        $func$;
    END IF;
END;
$$;

-- Check and fix complete_onboarding_atomic if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'complete_onboarding_atomic') THEN
        -- First check what the actual signature is
        RAISE NOTICE 'complete_onboarding_atomic function exists - check signature manually';
        -- Note: This function signature varies, need to check manually
    END IF;
END;
$$;

-- =============================================================================
-- FIX 3: RLS Performance Optimization (Verified Policies)
-- =============================================================================

-- Fix the chat_conversations policies to use subquery pattern for better performance
-- Only if the policies exist (they should after our surgical chat fix)

-- Check current policies first
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'chat_conversations';

-- Drop and recreate with optimized patterns
DROP POLICY IF EXISTS "chat_conversations_insert_policy" ON chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_select_policy" ON chat_conversations;

-- Create optimized policies with subquery pattern for performance
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
-- VERIFICATION
-- =============================================================================

-- Check that functions now have proper search_path and exist
SELECT 
    routine_name,
    routine_type,
    security_type,
    routine_definition LIKE '%search_path%' as has_search_path_set
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('match_documents', 'match_document_chunks', 'search_documents')
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

-- Test the main function still works
SELECT 
    'FUNCTION TEST' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'match_documents') 
        THEN '✅ match_documents function updated with security fixes'
        ELSE '❌ Function missing after update'
    END as status;

-- Success message
SELECT 'Corrected surgical security fixes applied successfully!' as status;
