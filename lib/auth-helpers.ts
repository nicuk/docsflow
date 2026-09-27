import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// SECURITY FIX: Use secure database service instead of direct service role
import { SecureDocumentService, SecureTenantService, SecureUserService } from '@/lib/secure-database';

// Initialize Supabase client with service role
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * The caller's access level in `tenantId`, or null when it cannot be
 * established. Level 1 is admin, so an unknown caller must never get 1: this
 * used to return 1 for a missing token, a bad token or any error.
 */
export async function getUserAccessLevel(request: NextRequest, tenantId: string): Promise<number | null> {
  try {
    const supabase = getSupabaseClient();

    const authHeader = request.headers.get('authorization');
    if (!authHeader) return null;

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('access_level')
      .eq('id', user.id)
      .eq('tenant_id', tenantId)
      .single();

    if (userError || !userData || typeof userData.access_level !== 'number') return null;
    return userData.access_level;
  } catch (err) {
    console.error('getUserAccessLevel failed:', err);
    return null;
  }
}

export async function getTenantFromSubdomain(subdomain: string) {
  try {
    const supabase = getSupabaseClient();
    
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', subdomain)
      .single();

    if (error) {
      return null;
    }

    return tenant;
  } catch {
    return null;
  }
}

export async function validateAuth(request: NextRequest): Promise<{ tenantId: string | null; userId: string | null }> {
  try {
    const supabase = getSupabaseClient();

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return { tenantId: null, userId: null };
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { tenantId: null, userId: null };
    }

    // The tenant is the one on the user's own row. It used to be taken from the
    // x-tenant-id header (or client-writable user_metadata), so any account
    // could read and write another tenant's upload queue.
    const { data: member } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .maybeSingle();

    return { tenantId: member?.tenant_id ?? null, userId: user.id };
  } catch {
    return { tenantId: null, userId: null };
  }
}

export function extractTenantFromRequest(request: NextRequest): string {
  const url = new URL(request.url);
  const subdomain = url.hostname.split('.')[0];
  
  // Handle various deployment scenarios
  if (subdomain === 'localhost' || subdomain.includes('docsflow')) {
    // For local development, extract from path or use default
    const pathSegments = url.pathname.split('/');
    if (pathSegments[1] && pathSegments[1] !== 'api') {
      return pathSegments[1]; // Use path-based tenant for local dev
    }
    return 'main'; // Default for main domain
  }
  
  return subdomain;
}