-- ===============================================
-- CRITICAL SECURITY FIX: Enable RLS on ai_models Table
-- Resolves: policy_exists_rls_disabled + rls_disabled_in_public
-- ===============================================

-- PHASE 1: Enable Row Level Security on ai_models
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;

-- PHASE 2: Verify RLS is properly enabled
DO $$
DECLARE
  rls_enabled BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Check if RLS is enabled
  SELECT c.relrowsecurity INTO rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'ai_models';
  
  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'CRITICAL: RLS not enabled on ai_models table';
  END IF;
  
  -- Check if policies exist
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'ai_models';
  
  IF policy_count = 0 THEN
    RAISE EXCEPTION 'CRITICAL: No RLS policies found for ai_models table';
  END IF;
  
  RAISE NOTICE '✅ SECURITY FIX: RLS enabled on ai_models with % policies', policy_count;
END;
$$;

-- PHASE 3: Security Audit Log
INSERT INTO analytics_events (
  tenant_id, 
  event_type, 
  event_data,
  created_at
) 
SELECT 
  t.id,
  'security_fix_applied',
  jsonb_build_object(
    'migration', '005_fix_ai_models_rls',
    'table_secured', 'ai_models',
    'rls_enabled', true,
    'security_level', 'CRITICAL_FIX_APPLIED'
  ),
  NOW()
FROM tenants t;

-- ===============================================
-- SECURITY FIX COMPLETE
-- ai_models table now properly secured with RLS
-- All security warnings should be resolved
-- =============================================== 