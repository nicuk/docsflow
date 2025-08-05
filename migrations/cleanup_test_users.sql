-- DEVELOPMENT CLEANUP: Remove Test Users and Data
-- WARNING: This will permanently delete test users and their data
-- SAFE: Preserves wellnickchin@gmail.com (main account)

BEGIN;

-- Log what we're about to do
DO $$
BEGIN
    RAISE NOTICE 'Starting cleanup of test users...';
    RAISE NOTICE 'PRESERVING: wellnickchin@gmail.com (main account)';
    RAISE NOTICE 'REMOVING: All other test accounts';
END $$;

-- Get the user IDs we want to remove (all except main account)
CREATE TEMP TABLE users_to_remove AS
SELECT id, email, name, tenant_id
FROM users 
WHERE email != 'wellnickchin@gmail.com';

-- Show what we're removing
DO $$
DECLARE
    user_record RECORD;
BEGIN
    RAISE NOTICE 'Users to be removed:';
    FOR user_record IN SELECT email FROM users_to_remove LOOP
        RAISE NOTICE '  - %', user_record.email;
    END LOOP;
END $$;

-- Remove related data in correct order (respecting foreign keys)

-- 1. Remove chat messages first (references chat_conversations)
DELETE FROM chat_messages 
WHERE conversation_id IN (
    SELECT id FROM chat_conversations 
    WHERE user_id IN (SELECT id FROM users_to_remove)
);

-- 2. Remove chat conversations
DELETE FROM chat_conversations 
WHERE user_id IN (SELECT id FROM users_to_remove);

-- 3. Remove user sessions
DELETE FROM user_sessions 
WHERE user_id IN (SELECT id FROM users_to_remove);

-- 4. Remove notifications
DELETE FROM notifications 
WHERE user_id IN (SELECT id FROM users_to_remove);

-- 5. Remove API usage records
DELETE FROM api_usage 
WHERE user_id IN (SELECT id FROM users_to_remove);

-- 6. Remove file uploads
DELETE FROM file_uploads 
WHERE uploaded_by IN (SELECT id FROM users_to_remove);

-- 7. Unassign leads (don't delete leads, just unassign)
UPDATE leads 
SET assigned_to = NULL 
WHERE assigned_to IN (SELECT id FROM users_to_remove);

-- 8. Remove user invitations (sent by these users)
DELETE FROM user_invitations 
WHERE invited_by IN (SELECT id FROM users_to_remove);

-- 9. Remove user invitations (accepted by these users)
DELETE FROM user_invitations 
WHERE accepted_by IN (SELECT id FROM users_to_remove);

-- 10. Remove document chunks for tenants that will be cleaned up
-- Note: documents table doesn't have uploaded_by column, so we'll clean by tenant
DELETE FROM document_chunks 
WHERE tenant_id IN (
    SELECT DISTINCT u.tenant_id FROM users_to_remove u
    WHERE u.tenant_id IS NOT NULL
);

-- 11. Remove documents for tenants that will be cleaned up
-- Note: documents table doesn't have uploaded_by column, only tenant_id
DELETE FROM documents 
WHERE tenant_id IN (
    SELECT DISTINCT u.tenant_id FROM users_to_remove u
    WHERE u.tenant_id IS NOT NULL
);

-- 12. Finally, remove the users themselves
DELETE FROM users 
WHERE id IN (SELECT id FROM users_to_remove);

-- Clean up temp table
DROP TABLE users_to_remove;

-- Final verification
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count FROM users;
    RAISE NOTICE 'Cleanup complete!';
    RAISE NOTICE 'Remaining users: %', remaining_count;
    RAISE NOTICE 'Should be 1 user remaining (wellnickchin@gmail.com)';
END $$;

-- Show remaining users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    RAISE NOTICE 'Remaining users:';
    FOR user_record IN SELECT email, name FROM users ORDER BY email LOOP
        RAISE NOTICE '  - % (%)', user_record.email, COALESCE(user_record.name, 'No name');
    END LOOP;
END $$;

COMMIT;
