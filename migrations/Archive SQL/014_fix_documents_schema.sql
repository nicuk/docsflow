-- Migration 014: Fix documents table schema issues
-- This migration fixes schema inconsistencies in the documents table

DO $$ 
BEGIN
    -- Add missing columns to documents table if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'file_url'
    ) THEN
        ALTER TABLE documents ADD COLUMN file_url TEXT;
        RAISE NOTICE 'Added file_url column to documents table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'document_category'
    ) THEN
        ALTER TABLE documents ADD COLUMN document_category TEXT DEFAULT 'general';
        RAISE NOTICE 'Added document_category column to documents table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'access_level'
    ) THEN
        ALTER TABLE documents ADD COLUMN access_level INTEGER DEFAULT 1 CHECK (access_level BETWEEN 1 AND 5);
        RAISE NOTICE 'Added access_level column to documents table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'uploaded_by'
    ) THEN
        ALTER TABLE documents ADD COLUMN uploaded_by UUID REFERENCES users(id);
        RAISE NOTICE 'Added uploaded_by column to documents table';
    END IF;

    -- Add missing status column to chat_conversations table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_conversations' AND column_name = 'status'
    ) THEN
        ALTER TABLE chat_conversations ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted'));
        RAISE NOTICE 'Added status column to chat_conversations table';
    END IF;

    -- Create missing indexes if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'documents' AND indexname = 'idx_documents_category'
    ) THEN
        CREATE INDEX idx_documents_category ON documents(document_category);
        RAISE NOTICE 'Created index on document_category';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'documents' AND indexname = 'idx_documents_access_level'
    ) THEN
        CREATE INDEX idx_documents_access_level ON documents(access_level);
        RAISE NOTICE 'Created index on access_level';
    END IF;

    -- Fix the get_document_stats function to handle missing category gracefully
    CREATE OR REPLACE FUNCTION get_document_stats(tenant_uuid UUID)
    RETURNS TABLE (
      total_documents INTEGER,
      documents_by_category JSONB,
      processing_status_counts JSONB,
      total_storage_mb NUMERIC
    ) AS $func$
    BEGIN
      RETURN QUERY
      SELECT 
        COUNT(*)::INTEGER as total_documents,
        COALESCE(jsonb_object_agg(
          COALESCE(document_category, 'uncategorized'), 
          category_count
        ) FILTER (WHERE category_count > 0), '{}'::jsonb) as documents_by_category,
        COALESCE(jsonb_object_agg(
          processing_status, 
          status_count
        ) FILTER (WHERE status_count > 0), '{}'::jsonb) as processing_status_counts,
        ROUND(SUM(COALESCE(file_size, 0))::NUMERIC / 1048576, 2) as total_storage_mb
      FROM (
        SELECT 
          COALESCE(document_category, 'general') as document_category,
          processing_status,
          file_size,
          COUNT(*) OVER (PARTITION BY COALESCE(document_category, 'general')) as category_count,
          COUNT(*) OVER (PARTITION BY processing_status) as status_count
        FROM documents 
        WHERE tenant_id::text = tenant_uuid::text
      ) d;
    END;
    $func$ LANGUAGE plpgsql;

    RAISE NOTICE 'Migration 014 completed successfully';

EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Migration 014 failed: %', SQLERRM;
        RAISE;
END $$;
