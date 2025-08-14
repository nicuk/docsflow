-- Add access_level column to documents table
-- This migration adds the missing access_level column that the application expects

ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS access_level text DEFAULT 'private' 
CHECK (access_level IN ('private', 'public', 'restricted', 'shared'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_access_level ON public.documents(access_level);

-- Add comment for documentation
COMMENT ON COLUMN public.documents.access_level IS 'Access control level for the document: private (owner only), public (all users), restricted (specific users), shared (tenant members)';
