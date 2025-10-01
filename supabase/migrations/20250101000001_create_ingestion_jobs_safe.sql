-- =====================================================
-- INGESTION JOBS QUEUE SYSTEM (SAFE VERSION)
-- =====================================================
-- Purpose: Database-backed job queue for document processing
-- Safety: Checks for required tables before creating
-- =====================================================

-- =====================================================
-- SAFETY CHECK: Verify required tables exist
-- =====================================================

DO $$ 
BEGIN
  -- Check if tenants table exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tenants') THEN
    RAISE EXCEPTION 'tenants table does not exist. Please create it first or run your main schema migration.';
  END IF;
  
  -- Check if documents table exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'documents') THEN
    RAISE EXCEPTION 'documents table does not exist. Please create it first or run your main schema migration.';
  END IF;
  
  RAISE NOTICE 'Safety check passed: Required tables exist';
END $$;

-- =====================================================
-- Create ingestion_jobs table
-- =====================================================

CREATE TABLE IF NOT EXISTS ingestion_jobs (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  tenant_id UUID NOT NULL,
  document_id UUID,
  
  -- Job data
  filename TEXT NOT NULL,
  file_size BIGINT,
  file_path TEXT NOT NULL, -- Storage path in Supabase Storage
  file_type TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Retry logic
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ, -- For exponential backoff
  
  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Error handling
  error_message TEXT,
  error_stack TEXT,
  
  -- Metadata (store any extra processing data)
  processing_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Constraints
  CONSTRAINT valid_attempts CHECK (attempts <= max_attempts),
  CONSTRAINT valid_timing CHECK (
    (started_at IS NULL OR started_at >= created_at) AND
    (completed_at IS NULL OR completed_at >= created_at)
  )
);

-- Add foreign key constraints AFTER table creation
ALTER TABLE ingestion_jobs 
  DROP CONSTRAINT IF EXISTS ingestion_jobs_tenant_id_fkey,
  ADD CONSTRAINT ingestion_jobs_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ingestion_jobs
  DROP CONSTRAINT IF EXISTS ingestion_jobs_document_id_fkey,
  ADD CONSTRAINT ingestion_jobs_document_id_fkey
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Critical: Fast lookup of pending jobs ready for processing
CREATE INDEX IF NOT EXISTS idx_jobs_pending ON ingestion_jobs(tenant_id, created_at) 
  WHERE status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= NOW());

-- Fast lookup of processing jobs (for stale job cleanup)
CREATE INDEX IF NOT EXISTS idx_jobs_processing ON ingestion_jobs(tenant_id, started_at) 
  WHERE status = 'processing';

-- Fast lookup of jobs by status
CREATE INDEX IF NOT EXISTS idx_jobs_status ON ingestion_jobs(tenant_id, status, created_at DESC);

-- Fast lookup of document's jobs
CREATE INDEX IF NOT EXISTS idx_jobs_document ON ingestion_jobs(document_id) 
  WHERE document_id IS NOT NULL;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own tenant jobs" ON ingestion_jobs;
DROP POLICY IF EXISTS "Users can create jobs for own tenant" ON ingestion_jobs;
DROP POLICY IF EXISTS "Service role has full access" ON ingestion_jobs;

-- Users can only view jobs from their tenant
CREATE POLICY "Users can view own tenant jobs"
  ON ingestion_jobs 
  FOR SELECT
  USING (
    -- Allow if tenant_id matches current user's tenant
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can create jobs for their tenant
CREATE POLICY "Users can create jobs for own tenant"
  ON ingestion_jobs 
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Service role has full access (for worker)
CREATE POLICY "Service role has full access"
  ON ingestion_jobs 
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- ATOMIC JOB FETCHING FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_pending_jobs(
  p_max_jobs INT DEFAULT 10
)
RETURNS SETOF ingestion_jobs
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM ingestion_jobs
  WHERE status = 'pending'
    AND (next_retry_at IS NULL OR next_retry_at <= NOW())
  ORDER BY created_at ASC
  LIMIT p_max_jobs
  FOR UPDATE SKIP LOCKED; -- ⭐ CRITICAL: Prevents race conditions
END;
$$;

GRANT EXECUTE ON FUNCTION get_pending_jobs(INT) TO service_role;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION reset_stale_jobs(
  p_timeout_minutes INT DEFAULT 5
)
RETURNS TABLE (
  reset_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  UPDATE ingestion_jobs
  SET 
    status = 'pending',
    error_message = 'Job timed out - worker crashed or exceeded processing time',
    next_retry_at = NOW() + INTERVAL '1 minute'
  WHERE status = 'processing'
    AND started_at < NOW() - (p_timeout_minutes || ' minutes')::INTERVAL;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION reset_stale_jobs(INT) TO service_role;

CREATE OR REPLACE FUNCTION get_job_stats(p_tenant_id UUID)
RETURNS TABLE (
  total_jobs BIGINT,
  pending BIGINT,
  processing BIGINT,
  completed BIGINT,
  failed BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_jobs,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending,
    COUNT(*) FILTER (WHERE status = 'processing')::BIGINT AS processing,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT AS completed,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT AS failed
  FROM ingestion_jobs
  WHERE tenant_id = p_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_job_stats(UUID) TO authenticated, service_role;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE ingestion_jobs IS 'Queue system for document processing jobs';
COMMENT ON COLUMN ingestion_jobs.status IS 'Job status: pending, processing, completed, failed, cancelled';
COMMENT ON COLUMN ingestion_jobs.next_retry_at IS 'When to retry failed jobs (exponential backoff)';
COMMENT ON COLUMN ingestion_jobs.processing_metadata IS 'JSON metadata for intermediate processing state';
COMMENT ON FUNCTION get_pending_jobs IS 'Atomically fetch and lock pending jobs for processing';
COMMENT ON FUNCTION reset_stale_jobs IS 'Reset jobs stuck in processing state';
COMMENT ON FUNCTION get_job_stats IS 'Get job statistics for a tenant';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Ingestion jobs queue system created successfully';
  RAISE NOTICE '📊 Table: ingestion_jobs';
  RAISE NOTICE '🔧 Functions: get_pending_jobs, reset_stale_jobs, get_job_stats';
  RAISE NOTICE '🔒 RLS policies enabled';
END $$;

