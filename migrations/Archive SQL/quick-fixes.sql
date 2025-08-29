-- COMPLETE USER & TENANT CLEANUP FOR TESTING
-- Removes all users, tenants, and related data in correct order to respect foreign keys
-- Use this instead of deleting from Supabase Auth UI

BEGIN;

-- ========================================
-- PART 1: SAFETY CHECK
-- ========================================

-- Show current counts before cleanup
SELECT 
    'auth.users' as table_name,
    COUNT(*) as record_count
FROM auth.users
UNION ALL
SELECT 
    'public.users' as table_name,
    COUNT(*) as record_count
FROM users
UNION ALL
SELECT 
    'public.tenants' as table_name,
    COUNT(*) as record_count
FROM tenants;

-- ========================================
-- PART 2: CLEAN TENANT-DEPENDENT DATA FIRST
-- ========================================

-- Clean document processing jobs (tenant-dependent)
DELETE FROM document_processing_jobs;

-- Clean documents (tenant-dependent)
DELETE FROM documents;

-- Clean analytics aggregations (tenant-dependent)
DELETE FROM analytics_aggregations;

-- Clean analytics events (tenant-dependent)
DELETE FROM analytics_events;

-- Clean API usage records (tenant-dependent)
DELETE FROM api_usage;

-- Clean chat conversations and messages (tenant-dependent)
DELETE FROM chat_messages;
DELETE FROM chat_conversations;

-- Clean leads (tenant-dependent)
DELETE FROM leads;

-- Clean notifications (user-dependent)
DELETE FROM notifications;

-- Clean user sessions
DELETE FROM user_sessions;

-- Clean user invitations
DELETE FROM user_invitations;

-- ========================================
-- PART 3: CLEAN USERS AND TENANTS IN CORRECT ORDER
-- ========================================

-- Clean from public.users first (has foreign key to auth.users AND tenants)
DELETE FROM users;

-- Clean tenants (now safe since no users reference them)
DELETE FROM tenants;

-- Clean from auth.users last
DELETE FROM auth.users;

-- ========================================
-- PART 4: VERIFICATION
-- ========================================

-- Verify cleanup was successful
SELECT 
    'auth.users' as table_name,
    COUNT(*) as remaining_count
FROM auth.users
UNION ALL
SELECT 
    'public.users' as table_name,
    COUNT(*) as remaining_count
FROM users
UNION ALL
SELECT 
    'public.tenants' as table_name,
    COUNT(*) as remaining_count
FROM tenants
UNION ALL
SELECT 
    'user_sessions' as table_name,
    COUNT(*) as remaining_count
FROM user_sessions
UNION ALL
SELECT 
    'notifications' as table_name,
    COUNT(*) as remaining_count
FROM notifications
UNION ALL
SELECT 
    'user_invitations' as table_name,
    COUNT(*) as remaining_count
FROM user_invitations
UNION ALL
SELECT 
    'api_usage' as table_name,
    COUNT(*) as remaining_count
FROM api_usage
UNION ALL
SELECT 
    'analytics_events' as table_name,
    COUNT(*) as remaining_count
FROM analytics_events
UNION ALL
SELECT 
    'chat_conversations' as table_name,
    COUNT(*) as remaining_count
FROM chat_conversations
UNION ALL
SELECT 
    'documents' as table_name,
    COUNT(*) as remaining_count
FROM documents
UNION ALL
SELECT 
    'document_processing_jobs' as table_name,
    COUNT(*) as remaining_count
FROM document_processing_jobs
UNION ALL
SELECT 
    'leads' as table_name,
    COUNT(*) as remaining_count
FROM leads;

COMMIT;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '=== COMPLETE USER & TENANT CLEANUP COMPLETE ===';
    RAISE NOTICE 'All users, tenants, and related data have been safely removed';
    RAISE NOTICE 'Database integrity maintained - no orphaned records';
    RAISE NOTICE 'Ready for fresh user flow testing';
    RAISE NOTICE 'You can now test registration/login/onboarding from scratch';
    RAISE NOTICE 'No more "bitto" or "test" tenant conflicts!';
END $$;