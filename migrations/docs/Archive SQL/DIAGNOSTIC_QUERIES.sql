-- DIAGNOSTIC QUERIES - Root Cause Analysis
-- Run these queries to understand the actual database state and issues

-- ============================================
-- 1. SCHEMA EXISTENCE CHECK
-- ============================================
SELECT 
    'Schema Analysis' as category,
    'Tables' as type,
    table_name,
    NULL as detail
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'chat_conversations', 
    'chat_messages', 
    'users', 
    'documents', 
    'document_chunks',
    'tenants'
  )

UNION ALL

-- ============================================
-- 2. FOREIGN KEY CONSTRAINTS ANALYSIS
-- ============================================
SELECT 
    'Foreign Keys' as category,
    tc.table_name as type,
    tc.constraint_name as table_name,
    CONCAT(kcu.column_name, ' -> ', ccu.table_name, '.', ccu.column_name) as detail
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('chat_conversations', 'chat_messages')

UNION ALL

-- ============================================
-- 3. FUNCTION EXISTENCE CHECK
-- ============================================
SELECT 
    'Functions' as category,
    proname as type,
    pg_get_function_identity_arguments(oid) as table_name,
    CASE 
        WHEN prorettype = 'record'::regtype THEN 'Returns TABLE'
        ELSE pg_catalog.format_type(prorettype, NULL)
    END as detail
FROM pg_proc 
WHERE proname LIKE '%similarity_search%'
  OR proname LIKE '%ensure_user%'

ORDER BY category, type, table_name;

-- ============================================
-- 4. DATA INTEGRITY ISSUES
-- ============================================

-- Check for orphaned chat_conversations
SELECT 
    'Data Issues' as issue_type,
    'Orphaned chat_conversations' as description,
    COUNT(*) as count,
    'Records with user_id not in users table' as details
FROM chat_conversations cc
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = cc.user_id)
  AND cc.user_id IS NOT NULL;

-- Check for orphaned chat_messages
SELECT 
    'Data Issues' as issue_type,
    'Orphaned chat_messages' as description,
    COUNT(*) as count,
    'Messages without valid conversation_id' as details
FROM chat_messages cm
WHERE NOT EXISTS (SELECT 1 FROM chat_conversations cc WHERE cc.id = cm.conversation_id);

-- Check for missing tenant references
SELECT 
    'Data Issues' as issue_type,
    'Invalid tenant references' as description,
    COUNT(*) as count,
    'Records with tenant_id not in tenants table' as details
FROM (
    SELECT tenant_id FROM chat_conversations WHERE tenant_id IS NOT NULL
    UNION ALL
    SELECT tenant_id FROM chat_messages WHERE tenant_id IS NOT NULL
    UNION ALL
    SELECT tenant_id FROM users WHERE tenant_id IS NOT NULL
) all_tenant_refs
WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = all_tenant_refs.tenant_id);

-- ============================================
-- 5. VECTOR SEARCH CAPABILITY CHECK
-- ============================================

-- Check if vector extension is installed
SELECT 
    'Vector Support' as issue_type,
    'Extension Status' as description,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') 
        THEN 'INSTALLED' 
        ELSE 'MISSING' 
    END as count,
    'pgvector extension for similarity search' as details;

-- Check embedding column types
SELECT 
    'Vector Support' as issue_type,
    CONCAT(table_name, '.', column_name) as description,
    data_type as count,
    udt_name as details
FROM information_schema.columns
WHERE column_name = 'embedding'
  AND table_schema = 'public';

-- ============================================
-- 6. RECENT ERROR PATTERNS
-- ============================================

-- Check for recent failed operations (if logs table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'error_logs') THEN
        RAISE NOTICE 'Error logs table found - checking recent errors';
        -- Would add error log queries here
    ELSE
        RAISE NOTICE 'No error logs table found';
    END IF;
END $$;

-- ============================================
-- 7. USER AUTHENTICATION SETUP
-- ============================================

-- Check auth schema (Supabase)
SELECT 
    'Auth Setup' as issue_type,
    'Auth Schema' as description,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth')
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as count,
    'Supabase auth schema presence' as details;

-- Check auth.users table if auth schema exists
SELECT 
    'Auth Setup' as issue_type,
    'Auth Users Table' as description,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users')
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as count,
    'Supabase auth.users table' as details;

-- ============================================
-- 8. SAMPLE DATA CHECK
-- ============================================

-- Get sample counts to understand data volume
SELECT 
    'Data Volume' as issue_type,
    table_name as description,
    (xpath('/row/count/text()', xml_count))[1]::text::int as count,
    'Current record count' as details
FROM (
    SELECT 
        'tenants' as table_name,
        query_to_xml('SELECT COUNT(*) as count FROM tenants', false, true, '') as xml_count
    UNION ALL
    SELECT 
        'users' as table_name,
        query_to_xml('SELECT COUNT(*) as count FROM users', false, true, '') as xml_count
    UNION ALL
    SELECT 
        'chat_conversations' as table_name,
        query_to_xml('SELECT COUNT(*) as count FROM chat_conversations', false, true, '') as xml_count
    UNION ALL
    SELECT 
        'chat_messages' as table_name,
        query_to_xml('SELECT COUNT(*) as count FROM chat_messages', false, true, '') as xml_count
) counts;
