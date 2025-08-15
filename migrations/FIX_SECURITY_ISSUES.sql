-- ============================================================================
-- SECURITY & PERFORMANCE FIXES - CRITICAL
-- Fixes RLS, search_path, and performance issues
-- ============================================================================

BEGIN;

-- ============================================================================
-- FIX 1: ENABLE RLS ON NEW TABLES (CRITICAL SECURITY)
-- ============================================================================

-- Enable RLS on onboarding_responses
ALTER TABLE public.onboarding_responses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own onboarding responses
CREATE POLICY "Users can view own onboarding" ON public.onboarding_responses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding" ON public.onboarding_responses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding" ON public.onboarding_responses
    FOR UPDATE USING (auth.uid() = user_id);

-- Enable RLS on tenant_admins
ALTER TABLE public.tenant_admins ENABLE ROW LEVEL SECURITY;

-- Policy: Only tenant admins can view/manage tenant admins
CREATE POLICY "Tenant admins can view admins" ON public.tenant_admins
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tenant_admins ta
            WHERE ta.tenant_id = tenant_admins.tenant_id
            AND ta.user_id = auth.uid()
            AND ta.access_level >= 2
        )
    );

CREATE POLICY "Super admins can manage admins" ON public.tenant_admins
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tenant_admins ta
            WHERE ta.tenant_id = tenant_admins.tenant_id
            AND ta.user_id = auth.uid()
            AND ta.access_level >= 3
        )
    );

-- Enable RLS on admin_audit_log (if not already enabled)
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FIX 2: FUNCTION SEARCH_PATH SECURITY
-- ============================================================================

-- Fix similarity_search_v2 function with secure search_path
DROP FUNCTION IF EXISTS similarity_search_v2(vector(768), int, uuid);

CREATE OR REPLACE FUNCTION similarity_search_v2(
    query_embedding vector(768),
    match_count int DEFAULT 5,
    tenant_filter uuid DEFAULT NULL
)
RETURNS TABLE (
    chunk_id uuid,
    document_id uuid,
    content text,
    metadata jsonb,
    similarity float4,
    tenant_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
    SELECT 
        id as chunk_id,
        document_id,
        content,
        metadata,
        (1 - (embedding::vector(768) <=> query_embedding::vector(768)))::float4 as similarity,
        tenant_id
    FROM public.document_chunks
    WHERE 
        embedding IS NOT NULL
        AND (tenant_filter IS NULL OR tenant_id = tenant_filter)
    ORDER BY embedding::vector(768) <=> query_embedding::vector(768)
    LIMIT match_count;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION similarity_search_v2 TO authenticated;

-- Fix complete_onboarding_atomic function (if exists)
DROP FUNCTION IF EXISTS complete_onboarding_atomic;

CREATE OR REPLACE FUNCTION complete_onboarding_atomic(
    p_user_id uuid,
    p_responses jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_tenant_id uuid;
    v_result jsonb;
BEGIN
    -- Get tenant_id for user
    SELECT tenant_id INTO v_tenant_id
    FROM public.users
    WHERE id = p_user_id;
    
    -- Insert or update onboarding responses
    INSERT INTO public.onboarding_responses (user_id, tenant_id, responses)
    VALUES (p_user_id, v_tenant_id, p_responses)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        responses = EXCLUDED.responses,
        updated_at = now();
    
    v_result := jsonb_build_object(
        'success', true,
        'message', 'Onboarding completed'
    );
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION complete_onboarding_atomic TO authenticated;

-- ============================================================================
-- FIX 3: OPTIMIZE RLS PERFORMANCE
-- ============================================================================

-- Fix admin_audit_log RLS policy for better performance
DROP POLICY IF EXISTS "admin_audit_tenant_admin_read" ON public.admin_audit_log;

CREATE POLICY "admin_audit_tenant_admin_read" ON public.admin_audit_log
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_admins
            WHERE user_id = (SELECT auth.uid())
            AND access_level >= 2
        )
    );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_rls_count int;
    v_func_count int;
BEGIN
    -- Check RLS enabled
    SELECT COUNT(*) INTO v_rls_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('onboarding_responses', 'tenant_admins', 'admin_audit_log')
    AND rowsecurity = true;
    
    IF v_rls_count = 3 THEN
        RAISE NOTICE '✅ RLS enabled on all critical tables';
    ELSE
        RAISE WARNING '⚠️ RLS not fully enabled. Count: %', v_rls_count;
    END IF;
    
    -- Check functions have search_path
    SELECT COUNT(*) INTO v_func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN ('similarity_search_v2', 'complete_onboarding_atomic')
    AND p.proconfig @> ARRAY['search_path=public, pg_catalog'];
    
    IF v_func_count >= 1 THEN
        RAISE NOTICE '✅ Functions have secure search_path';
    ELSE
        RAISE WARNING '⚠️ Functions missing search_path';
    END IF;
END $$;

COMMIT;
