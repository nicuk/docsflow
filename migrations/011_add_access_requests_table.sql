-- Migration: Add access_requests table for user access approval workflow
-- This table handles users who sign up and request access to a tenant

CREATE TABLE IF NOT EXISTS public.access_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  user_email text NOT NULL,
  user_name text NOT NULL,
  requested_role text NOT NULL DEFAULT 'user' CHECK (requested_role = ANY (ARRAY['admin'::text, 'user'::text, 'viewer'::text])),
  requested_access_level integer NOT NULL DEFAULT 3 CHECK (requested_access_level >= 1 AND requested_access_level <= 5),
  request_reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'expired'::text])),
  user_ip inet,
  user_agent text,
  approved_by uuid,
  approved_at timestamp with time zone,
  rejected_by uuid,
  rejected_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT access_requests_pkey PRIMARY KEY (id),
  CONSTRAINT access_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT access_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id),
  CONSTRAINT access_requests_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS access_requests_tenant_id_idx ON public.access_requests(tenant_id);
CREATE INDEX IF NOT EXISTS access_requests_email_idx ON public.access_requests(user_email);
CREATE INDEX IF NOT EXISTS access_requests_status_idx ON public.access_requests(status);
CREATE INDEX IF NOT EXISTS access_requests_created_at_idx ON public.access_requests(created_at);

-- Create unique constraint to prevent duplicate requests
CREATE UNIQUE INDEX IF NOT EXISTS access_requests_tenant_email_pending_unique 
ON public.access_requests(tenant_id, user_email) 
WHERE status = 'pending';

-- Function to cleanup expired access requests
CREATE OR REPLACE FUNCTION cleanup_expired_access_requests()
RETURNS void
LANGUAGE sql
AS $$
  UPDATE access_requests 
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending' AND created_at < now() - interval '30 days';
$$;

-- Function to submit access request
CREATE OR REPLACE FUNCTION submit_access_request(
  p_tenant_id uuid,
  p_user_email text,
  p_user_name text,
  p_requested_role text DEFAULT 'user',
  p_requested_access_level integer DEFAULT 3,
  p_request_reason text DEFAULT NULL,
  p_user_ip inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS TABLE (
  request_id uuid,
  status text,
  message text
)
LANGUAGE plpgsql
AS $$
DECLARE
  existing_request_id uuid;
  new_request_id uuid;
BEGIN
  -- Check if user already has access to this tenant
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE tenant_id = p_tenant_id 
    AND email = lower(p_user_email)
  ) THEN
    RETURN QUERY SELECT 
      NULL::uuid,
      'already_member'::text,
      'You are already a member of this organization'::text;
    RETURN;
  END IF;

  -- Check if there's already a pending request
  SELECT id INTO existing_request_id
  FROM access_requests
  WHERE tenant_id = p_tenant_id 
    AND user_email = lower(p_user_email)
    AND status = 'pending';

  IF existing_request_id IS NOT NULL THEN
    RETURN QUERY SELECT 
      existing_request_id,
      'pending'::text,
      'Your access request is already pending approval'::text;
    RETURN;
  END IF;

  -- Create new access request
  INSERT INTO access_requests (
    tenant_id,
    user_email,
    user_name,
    requested_role,
    requested_access_level,
    request_reason,
    user_ip,
    user_agent
  ) VALUES (
    p_tenant_id,
    lower(p_user_email),
    p_user_name,
    p_requested_role,
    p_requested_access_level,
    p_request_reason,
    p_user_ip,
    p_user_agent
  ) RETURNING id INTO new_request_id;

  RETURN QUERY SELECT 
    new_request_id,
    'submitted'::text,
    'Your access request has been submitted for approval'::text;
END;
$$;

-- Enable RLS (Row Level Security)
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view access requests for their tenant" ON public.access_requests
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage access requests for their tenant" ON public.access_requests
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid() AND access_level = 1
    )
  );

-- Public can insert access requests (for signup flow)
CREATE POLICY "Anyone can submit access requests" ON public.access_requests
  FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.access_requests TO service_role;
GRANT SELECT, INSERT ON public.access_requests TO anon;
GRANT SELECT, UPDATE ON public.access_requests TO authenticated;
