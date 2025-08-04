-- ============================================================================
-- CLEANUP DUPLICATE INDEXES
-- ============================================================================
-- Removes duplicate indexes detected by Supabase linter

-- Drop the duplicate index (keep the one with our naming convention)
DROP INDEX IF EXISTS user_invitations_tenant_id_idx;

-- Verify the cleanup
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'user_invitations'
AND indexname LIKE '%tenant_id%'
ORDER BY indexname;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Duplicate index cleanup completed!';
    RAISE NOTICE '🎯 Only idx_user_invitations_tenant_id should remain';
    RAISE NOTICE '📊 Performance optimization maintained';
END $$;
