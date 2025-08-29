-- Emergency fix: Add missing status column to chat_conversations
-- This fixes the error: "Could not find the 'status' column of 'chat_conversations' in the schema cache"

DO $$
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'chat_conversations' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.chat_conversations 
        ADD COLUMN status TEXT DEFAULT 'active' 
        CHECK (status IN ('active', 'archived', 'deleted'));
        
        RAISE NOTICE 'Added missing status column to chat_conversations table';
    ELSE
        RAISE NOTICE 'Status column already exists in chat_conversations table';
    END IF;
END $$;

-- Update any existing conversations to have active status
UPDATE public.chat_conversations 
SET status = 'active' 
WHERE status IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status 
ON public.chat_conversations(status);

-- Log the migration
INSERT INTO migration_logs (
    migration_name,
    operation_type,
    details,
    executed_at
) VALUES (
    '050_fix_chat_conversations_status',
    'schema_fix',
    jsonb_build_object(
        'issue', 'Missing status column in chat_conversations',
        'fix', 'Added status column with default value active',
        'constraint', 'CHECK status IN (active, archived, deleted)'
    ),
    NOW()
) ON CONFLICT DO NOTHING;
