-- SIMPLE LINTER FIX VERIFICATION
-- Check if we have exactly one policy per action and verify the actual policy content

BEGIN;

-- ========================================
-- PART 1: POLICY COUNT VERIFICATION
-- ========================================

-- Count policies per action - should be exactly 1 each
SELECT 
    CASE p.polcmd
        WHEN 'a' THEN 'INSERT'
        WHEN 'r' THEN 'SELECT' 
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        ELSE p.polcmd
    END as action,
    COUNT(*) as policy_count,
    ARRAY_AGG(p.polname) as policy_names
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'users' AND n.nspname = 'public'
GROUP BY p.polcmd
ORDER BY p.polcmd;

-- ========================================
-- PART 2: POLICY CONTENT VERIFICATION
-- ========================================

-- Show the actual policy definitions to verify subquery usage
SELECT 
    p.polname as policy_name,
    CASE p.polcmd
        WHEN 'a' THEN 'INSERT'
        WHEN 'r' THEN 'SELECT' 
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        ELSE p.polcmd
    END as action,
    -- Show the actual policy expression
    pg_get_expr(p.polqual, c.oid) as using_expression,
    pg_get_expr(p.polwithcheck, c.oid) as with_check_expression
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'users' AND n.nspname = 'public'
ORDER BY p.polname;

COMMIT;

-- ========================================
-- SUMMARY REPORT
-- ========================================

DO $$
DECLARE
    total_policies INTEGER;
    expected_policies INTEGER := 4;
BEGIN
    SELECT COUNT(*) INTO total_policies
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = 'users' AND n.nspname = 'public';
    
    RAISE NOTICE '=== LINTER FIX VERIFICATION REPORT ===';
    RAISE NOTICE 'Total policies on users table: % (expected: %)', total_policies, expected_policies;
    
    IF total_policies = expected_policies THEN
        RAISE NOTICE 'SUCCESS: Correct number of policies found!';
        RAISE NOTICE 'NEXT STEP: Check Supabase linter dashboard to verify warnings are gone';
        RAISE NOTICE 'Expected fixes:';
        RAISE NOTICE '- auth_rls_initplan warnings: Should be resolved (subqueries implemented)';
        RAISE NOTICE '- multiple_permissive_policies warnings: Should be resolved (duplicates removed)';
    ELSE
        RAISE WARNING 'ISSUE: Unexpected policy count - expected %, found %', expected_policies, total_policies;
    END IF;
END $$;
