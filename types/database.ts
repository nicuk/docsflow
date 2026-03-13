/**
 * Shared types for Supabase query results with joined relations.
 *
 * Supabase returns joined relations as arrays at the type level,
 * but `.single()` and foreign-key joins actually return objects.
 * These types eliminate the need for `as any` casts.
 */

export interface TenantRelation {
  id: string;
  subdomain: string;
  name: string;
  industry: string;
  logo_url?: string;
}

export interface InviterRelation {
  name: string;
  email: string;
}

export interface UserProfileWithTenant {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id: string;
  tenants: TenantRelation | null;
}

export interface InvitationWithTenant {
  id: string;
  email: string;
  role: string;
  access_level: number;
  status: string;
  tenant_id: string;
  expires_at: string;
  created_at: string;
  accepted_at?: string;
  accepted_by?: string;
  tenants: TenantRelation | null;
  invited_by: InviterRelation | null;
}
