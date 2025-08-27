-- ===============================================
-- SUPABASE SCHEMA DEPLOYMENT VALIDATION
-- Run this AFTER executing SUPABASE_IMPLEMENTATION.sql
-- ===============================================

-- PHASE 1: VERIFY EXTENSIONS
DO $$
BEGIN
  -- Check uuid-ossp extension
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
    RAISE EXCEPTION 'CRITICAL: uuid-ossp extension not installed';
  END IF;
  
  -- Check vector extension  
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE EXCEPTION 'CRITICAL: vector extension not installed';
  END IF;
  
  RAISE NOTICE '✅ EXTENSIONS: uuid-ossp and vector properly installed';
END;
$$;

-- PHASE 2: VERIFY TABLE CREATION
DO $$
DECLARE
  expected_tables TEXT[] := ARRAY[
    'tenants', 'users', 'documents', 'document_chunks', 'search_history',
    'chat_conversations', 'chat_messages', 'leads', 'lead_interactions', 
    'routing_rules', 'analytics_events', 'file_uploads'
  ];
  expected_table TEXT;
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  
  IF table_count < 12 THEN
    RAISE EXCEPTION 'CRITICAL: Only % tables found, expected 12+', table_count;
  END IF;
  
  -- Verify each expected table exists
  FOREACH expected_table IN ARRAY expected_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = expected_table
    ) THEN
      RAISE EXCEPTION 'CRITICAL: Table % missing', expected_table;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ TABLES: All % core tables created successfully', table_count;
END;
$$;

-- PHASE 3: VERIFY INDEXES
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes 
  WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%';
  
  IF index_count < 13 THEN
    RAISE EXCEPTION 'CRITICAL: Only % indexes found, expected 13+', index_count;
  END IF;
  
  RAISE NOTICE '✅ INDEXES: % performance indexes created', index_count;
END;
$$;

-- PHASE 4: VERIFY ROW LEVEL SECURITY
DO $$
DECLARE
  rls_table RECORD;
  rls_count INTEGER := 0;
BEGIN
  FOR rls_table IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('tenants', 'documents', 'leads', 'users')
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' 
      AND c.relname = rls_table.tablename
      AND c.relrowsecurity = true
    ) THEN
      RAISE EXCEPTION 'CRITICAL: RLS not enabled on table %', rls_table.tablename;
    END IF;
    rls_count := rls_count + 1;
  END LOOP;
  
  RAISE NOTICE '✅ SECURITY: RLS enabled on % critical tables', rls_count;
END;
$$;

-- PHASE 5: VERIFY FUNCTIONS EXIST (BEFORE SECURITY FIX)
DO $$
BEGIN
  -- Check similarity_search function
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'similarity_search'
  ) THEN
    RAISE EXCEPTION 'CRITICAL: similarity_search function missing';
  END IF;
  
  -- Check get_tenant_stats function
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p  
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_tenant_stats'
  ) THEN
    RAISE EXCEPTION 'CRITICAL: get_tenant_stats function missing';
  END IF;
  
  RAISE NOTICE '✅ FUNCTIONS: Core functions created successfully';
END;
$$;

-- PHASE 6: VERIFY SAMPLE DATA
DO $$
DECLARE
  tenant_count INTEGER;
  lead_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tenant_count FROM tenants;
  SELECT COUNT(*) INTO lead_count FROM leads;
  
  IF tenant_count < 3 THEN
    RAISE EXCEPTION 'CRITICAL: Only % tenants found, expected 3', tenant_count;
  END IF;
  
  IF lead_count < 2 THEN
    RAISE EXCEPTION 'CRITICAL: Only % leads found, expected 2+', lead_count;
  END IF;
  
  RAISE NOTICE '✅ SAMPLE DATA: % tenants and % leads created', tenant_count, lead_count;
END;
$$;

-- PHASE 7: TEST FUNCTION EXECUTION (MAY FAIL IF FUNCTIONS HAVE BUGS)
DO $$
DECLARE
  test_tenant_id UUID;
  stats_result RECORD;
BEGIN
  -- Get a test tenant ID
  SELECT id INTO test_tenant_id FROM tenants LIMIT 1;
  
  -- Test get_tenant_stats function (may fail due to ambiguous columns)
  BEGIN
    SELECT * INTO stats_result 
    FROM get_tenant_stats(test_tenant_id);
    
    RAISE NOTICE '✅ FUNCTION TEST: get_tenant_stats executed - Total leads: %', 
      COALESCE(stats_result.total_leads, 0);
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ FUNCTION ERROR: get_tenant_stats failed - %', SQLERRM;
      RAISE NOTICE '🔧 SOLUTION: Apply migrations/001_fix_base_functions.sql first';
  END;
END;
$$;

-- PHASE 8: TEST VECTOR SEARCH (WILL FAIL IF NO EMBEDDINGS)
DO $$
DECLARE
  search_result RECORD;
  embedding_count INTEGER;
BEGIN
  -- Check if we have any embeddings
  SELECT COUNT(*) INTO embedding_count 
  FROM document_chunks 
  WHERE embedding IS NOT NULL;
  
  IF embedding_count = 0 THEN
    RAISE NOTICE '⚠️  VECTOR SEARCH: No embeddings found - this is expected for new deployment';
  ELSE
    -- Test similarity search with dummy embedding
    SELECT * INTO search_result
    FROM similarity_search(
      array_fill(0.1, ARRAY[768])::vector(768),
      0.5, 
      1,
      'sme-demo',
      1
    ) LIMIT 1;
    
    RAISE NOTICE '✅ VECTOR SEARCH: Function executed successfully';
  END IF;
END;
$$;

-- PHASE 9: SECURITY AUDIT (SHOWS CURRENT VULNERABILITIES)
DO $$
DECLARE
  func_record RECORD;
BEGIN
  RAISE NOTICE '🔍 SECURITY AUDIT: Checking function security settings';
  
  FOR func_record IN
    SELECT 
      p.proname as function_name,
      p.prosecdef as is_security_definer,
      p.proconfig as search_path_config
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace  
    WHERE n.nspname = 'public' 
    AND p.proname IN ('similarity_search', 'get_tenant_stats')
  LOOP
    RAISE NOTICE 'Function: % | Security Definer: % | Search Path Config: %',
      func_record.function_name,
      func_record.is_security_definer,
      COALESCE(func_record.search_path_config::text, 'NOT SET');
      
    IF NOT func_record.is_security_definer THEN
      RAISE NOTICE '❌ SECURITY ISSUE: % lacks SECURITY DEFINER', func_record.function_name;
    END IF;
    
    IF func_record.search_path_config IS NULL THEN
      RAISE NOTICE '❌ SECURITY ISSUE: % has mutable search_path', func_record.function_name;
    END IF;
  END LOOP;
END;
$$;

-- PHASE 10: FINAL VALIDATION SUMMARY
DO $$
BEGIN
  RAISE NOTICE '===============================================';
  RAISE NOTICE '🎯 SCHEMA DEPLOYMENT VALIDATION COMPLETE';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. ✅ Base schema deployed successfully';
  RAISE NOTICE '2. ⚠️  Security warnings detected (expected)';
  RAISE NOTICE '3. 🔧 Apply 002_security_hardening.sql migration';
  RAISE NOTICE '4. 🔍 Re-run validation to confirm security fixes';
  RAISE NOTICE '===============================================';
END;
$$; 