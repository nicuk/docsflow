-- ============================================================================
-- CRITICAL FIX: Create usage_tracking table
-- ============================================================================
-- This table is referenced by lib/plan-enforcement.ts but was missing from schema
-- Error: "Error tracking usage: {}"
-- Date: 2025-10-01
-- ============================================================================

-- Create usage tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  documents_count INTEGER DEFAULT 0,
  conversations_count INTEGER DEFAULT 0,
  storage_used_mb INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per tenant per period
  UNIQUE(tenant_id, period_start, period_end)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_usage_tracking_tenant_period 
ON usage_tracking(tenant_id, period_start DESC);

-- Enable RLS
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own tenant usage" ON usage_tracking;
DROP POLICY IF EXISTS "Service role can manage usage" ON usage_tracking;

-- RLS Policy: Users can only see their tenant's usage
CREATE POLICY "Users can view own tenant usage"
ON usage_tracking FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  )
);

-- RLS Policy: Service role can manage all usage
CREATE POLICY "Service role can manage usage"
ON usage_tracking FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Verify table was created
SELECT 
  'usage_tracking table created successfully' as message,
  COUNT(*) as initial_row_count
FROM usage_tracking;

