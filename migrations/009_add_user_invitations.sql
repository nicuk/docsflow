-- Migration: Add user_invitations table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.user_invitations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role = ANY (ARRAY['admin'::text, 'user'::text, 'viewer'::text])),
  access_level integer NOT NULL DEFAULT 1 CHECK (access_level >= 1 AND access_level <= 5),
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'cancelled'::text])),
  expires_at timestamp with time zone NOT NULL,
  invited_by uuid,
  accepted_by uuid,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT user_invitations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT user_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id),
  CONSTRAINT user_invitations_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES public.users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS user_invitations_tenant_id_idx ON public.user_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS user_invitations_email_idx ON public.user_invitations(email);
CREATE INDEX IF NOT EXISTS user_invitations_token_idx ON public.user_invitations(token);
CREATE INDEX IF NOT EXISTS user_invitations_status_idx ON public.user_invitations(status);
CREATE INDEX IF NOT EXISTS user_invitations_expires_at_idx ON public.user_invitations(expires_at);

-- Create function to cleanup expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void
LANGUAGE sql
AS $$
  UPDATE user_invitations 
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending' AND expires_at < now();
$$;

-- Create function to check user limits for tenant
CREATE OR REPLACE FUNCTION check_user_limit(tenant_uuid uuid)
RETURNS TABLE (
  current_users integer,
  user_limit integer,
  can_add_user boolean
)
LANGUAGE sql
AS $$
  WITH tenant_info AS (
    SELECT 
      COALESCE((settings->>'user_limit')::integer, 10) as limit,
      COUNT(u.id) as current_count
    FROM tenants t
    LEFT JOIN users u ON u.tenant_id = t.id
    WHERE t.id = tenant_uuid
    GROUP BY t.id, t.settings
  )
  SELECT 
    ti.current_count::integer,
    ti.limit::integer,
    (ti.current_count < ti.limit) as can_add_user
  FROM tenant_info ti;
$$;

-- Enable RLS (Row Level Security)
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view invitations for their tenant" ON public.user_invitations
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage invitations for their tenant" ON public.user_invitations
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Grant permissions
GRANT ALL ON public.user_invitations TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.user_invitations TO anon; 