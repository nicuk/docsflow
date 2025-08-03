-- Add index for user_invitations.tenant_id for better query performance
-- This index will improve performance for tenant-specific invitation queries

CREATE INDEX IF NOT EXISTS idx_user_invitations_tenant_id 
ON public.user_invitations USING btree (tenant_id);

-- Verify the index was created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'user_invitations' 
AND indexname = 'idx_user_invitations_tenant_id';
