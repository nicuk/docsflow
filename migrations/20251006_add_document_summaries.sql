-- Add document summary columns for hierarchical retrieval
-- Phase 1A: Document Summarization
-- Date: 2025-10-06

-- Add summary column to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS summary_generated_at TIMESTAMPTZ;

-- Create GIN index for fast text search on summaries
CREATE INDEX IF NOT EXISTS idx_documents_summary 
ON documents 
USING gin(to_tsvector('english', COALESCE(summary, '')));

-- Add comment for documentation
COMMENT ON COLUMN documents.summary IS 'AI-generated 1-2 sentence summary of document content for hierarchical retrieval';
COMMENT ON COLUMN documents.summary_generated_at IS 'Timestamp when summary was generated';

-- Show stats
DO $$
DECLARE
  total_docs INTEGER;
  docs_with_summary INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_docs FROM documents;
  SELECT COUNT(*) INTO docs_with_summary FROM documents WHERE summary IS NOT NULL;
  
  RAISE NOTICE '✅ Migration complete!';
  RAISE NOTICE '📊 Total documents: %', total_docs;
  RAISE NOTICE '📝 Documents with summaries: % (%% coverage)', 
    docs_with_summary, 
    CASE WHEN total_docs > 0 THEN ROUND(docs_with_summary::numeric / total_docs * 100, 1) ELSE 0 END;
END $$;
