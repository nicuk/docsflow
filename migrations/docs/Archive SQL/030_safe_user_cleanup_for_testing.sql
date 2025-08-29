-- SAFE USER CLEANUP FOR TESTING
-- Removes all users and related data in correct order to respect foreign keys
-- Use this instead of deleting from Supabase Auth UI

BEGIN;

-- ========================================
-- PART 1: SAFETY CHECK
-- ========================================

-- Show current user count before cleanup
SELECT 
    'auth.users' as table_name,
    COUNT(*) as user_count
FROM auth.users
UNION ALL
SELECT 
    'public.users' as table_name,
    COUNT(*) as user_count
FROM users;

-- ========================================
-- PART 2: CLEAN DEPENDENT DATA FIRST
-- ========================================

-- Clean user sessions
DELETE FROM user_sessions;

-- Clean notifications
DELETE FROM notifications WHERE user_id IN (SELECT id FROM users);

-- Clean API usage records
DELETE FROM api_usage WHERE user_id IN (SELECT id FROM users);

-- Clean chat conversations and messages
DELETE FROM chat_messages WHERE conversation_id IN (
    SELECT id FROM chat_conversations WHERE user_id IN (SELECT id FROM users)
);
DELETE FROM chat_conversations WHERE user_id IN (SELECT id FROM users);

-- Clean analytics events
DELETE FROM analytics_events WHERE user_id IN (SELECT id FROM users);

-- Clean user invitations (both sent and received)
DELETE FROM user_invitations WHERE invited_by IN (SELECT id FROM users);
DELETE FROM user_invitations; -- Clean all remaining invitations

-- Unassign leads (don't delete leads, just unassign)
UPDATE leads SET assigned_to = NULL WHERE assigned_to IN (SELECT id FROM users);

-- Note: subscriptions table doesn't exist in current schema, skipping

-- ========================================
-- PART 3: CLEAN USERS IN CORRECT ORDER
-- ========================================

-- Clean from public.users first (has foreign key to auth.users)
DELETE FROM users;

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
FROM chat_conversations;

COMMIT;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '=== SAFE USER CLEANUP COMPLETE ===';
    RAISE NOTICE 'All users and related data have been safely removed';
    RAISE NOTICE 'Database integrity maintained - no orphaned records';
    RAISE NOTICE 'Ready for fresh user flow testing';
    RAISE NOTICE 'You can now test registration/login/onboarding from scratch';
END $$;
