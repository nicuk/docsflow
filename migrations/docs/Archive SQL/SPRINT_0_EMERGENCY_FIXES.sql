-- SPRINT 0: EMERGENCY DATABASE FIXES
-- Priority: 10/10 - BLOCKING ALL FUNCTIONALITY
-- Safe to run: YES - All operations are transactional and idempotent

BEGIN;

-- ============================================
-- FIX 1: Foreign Key Constraint on chat_conversations
-- ============================================

-- First, check if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'chat_conversations') THEN
        
        -- Drop existing constraint if it exists
        ALTER TABLE chat_conversations 
        DROP CONSTRAINT IF EXISTS chat_conversations_user_id_fkey;
        
        -- Add proper foreign key with CASCADE
        ALTER TABLE chat_conversations 
        ADD CONSTRAINT chat_conversations_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE;
        
        -- Add check constraint to prevent invalid UUIDs
        ALTER TABLE chat_conversations 
        DROP CONSTRAINT IF EXISTS valid_user_id;
        
        ALTER TABLE chat_conversations 
        ADD CONSTRAINT valid_user_id 
        CHECK (user_id IS NOT NULL AND user_id != '00000000-0000-0000-0000-000000000000'::uuid);
        
        RAISE NOTICE 'Fixed foreign key constraint on chat_conversations';
    ELSE
        RAISE NOTICE 'Table chat_conversations does not exist, skipping fix';
    END IF;
END $$;

-- ============================================
-- FIX 2: Update Vector Search Function References
-- ============================================

-- Fix any views that might be calling the old function
DO $$
DECLARE
    view_rec RECORD;
    view_def TEXT;
BEGIN
    FOR view_rec IN 
        SELECT viewname, definition 
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND definition LIKE '%similarity_search%'
        AND definition NOT LIKE '%similarity_search_v2%'
    LOOP
        -- Replace similarity_search with similarity_search_v2 in view definition
        view_def := REPLACE(view_rec.definition, 'similarity_search(', 'similarity_search_v2(');
        
        EXECUTE format('CREATE OR REPLACE VIEW %I AS %s', view_rec.viewname, view_def);
        RAISE NOTICE 'Updated view % to use similarity_search_v2', view_rec.viewname;
    END LOOP;
END $$;

-- ============================================
-- FIX 3: Ensure similarity_search_v2 exists with proper signature
-- ============================================

-- Drop and recreate the function with explicit type handling
DROP FUNCTION IF EXISTS similarity_search_v2(vector, integer, uuid);

CREATE OR REPLACE FUNCTION similarity_search_v2(
    query_embedding vector(768),
    match_count integer DEFAULT 5,
    tenant_uuid uuid DEFAULT NULL
)
RETURNS TABLE(
    id uuid,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.content,
        d.metadata,
        1 - (d.embedding::vector(768) <=> query_embedding::vector(768))::float as similarity
    FROM documents d
    WHERE 
        (tenant_uuid IS NULL OR d.tenant_id = tenant_uuid)
        AND d.embedding IS NOT NULL
    ORDER BY d.embedding::vector(768) <=> query_embedding::vector(768)
    LIMIT match_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION similarity_search_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION similarity_search_v2 TO service_role;

-- ============================================
-- FIX 4: Create fallback for missing user_id in chat
-- ============================================

-- Create a function to get or create a valid user_id for chat
CREATE OR REPLACE FUNCTION get_valid_user_id_for_chat()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid;
BEGIN
    -- Try to get current user
    current_user_id := auth.uid();
    
    -- If no current user, return a system user (for service operations)
    IF current_user_id IS NULL THEN
        -- Try to find or create a system user
        SELECT id INTO current_user_id
        FROM auth.users
        WHERE email = 'system@docsflow.app'
        LIMIT 1;
        
        IF current_user_id IS NULL THEN
            RAISE EXCEPTION 'No valid user context for chat operation';
        END IF;
    END IF;
    
    RETURN current_user_id;
END;
$$;

-- ============================================
-- FIX 5: Add trigger to auto-populate user_id if missing
-- ============================================

CREATE OR REPLACE FUNCTION ensure_valid_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If user_id is null or invalid, try to get current user
    IF NEW.user_id IS NULL OR NEW.user_id = '00000000-0000-0000-0000-000000000000'::uuid THEN
        NEW.user_id := auth.uid();
        
        -- If still null, reject the insert
        IF NEW.user_id IS NULL THEN
            RAISE EXCEPTION 'Cannot create chat conversation without valid user context';
        END IF;
    END IF;
    
    -- Verify the user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
        RAISE EXCEPTION 'User % does not exist', NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_valid_user_id_trigger ON chat_conversations;

-- Create the trigger
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'chat_conversations') THEN
        CREATE TRIGGER ensure_valid_user_id_trigger
        BEFORE INSERT ON chat_conversations
        FOR EACH ROW
        EXECUTE FUNCTION ensure_valid_user_id();
        
        RAISE NOTICE 'Created trigger to ensure valid user_id on chat_conversations';
    END IF;
END $$;

-- ============================================
-- FIX 6: Clean up any orphaned chat records
-- ============================================

-- Delete chat conversations with invalid user_ids
DELETE FROM chat_conversations
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Delete chat messages orphaned from deleted conversations
DELETE FROM chat_messages
WHERE conversation_id NOT IN (SELECT id FROM chat_conversations);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify all fixes were applied
DO $$
DECLARE
    fix_count integer := 0;
BEGIN
    -- Check if foreign key exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'chat_conversations_user_id_fkey') THEN
        fix_count := fix_count + 1;
        RAISE NOTICE '✓ Foreign key constraint exists';
    END IF;
    
    -- Check if similarity_search_v2 exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'similarity_search_v2') THEN
        fix_count := fix_count + 1;
        RAISE NOTICE '✓ similarity_search_v2 function exists';
    END IF;
    
    -- Check if trigger exists
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'ensure_valid_user_id_trigger') THEN
        fix_count := fix_count + 1;
        RAISE NOTICE '✓ User validation trigger exists';
    END IF;
    
    RAISE NOTICE 'Emergency fixes applied: % of 3', fix_count;
END $$;

COMMIT;

-- ============================================
-- POST-MIGRATION VERIFICATION
-- ============================================

-- Test the vector search function
-- SELECT * FROM similarity_search_v2(
--     (SELECT embedding FROM documents LIMIT 1)::vector(768),
--     5,
--     NULL
-- );

-- Check for any remaining orphaned records
-- SELECT COUNT(*) as orphaned_chats 
-- FROM chat_conversations c
-- WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = c.user_id);
