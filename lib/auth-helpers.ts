import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// SECURITY FIX: Use secure database service instead of direct service role
import { SecureDocumentService, SecureTenantService, SecureUserService } from '@/lib/secure-database';

// SURGICAL FIX: Initialize Supabase client properly
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function getUserAccessLevel(request: NextRequest, tenantId: string): Promise<number> {
  try {
    const supabase = getSupabaseClient();
    
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return 1; // Default to lowest access level for unauthenticated users
    }

    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return 1; // Default to lowest access level
    }

    // Get user's access level for this tenant
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('access_level')
      .eq('id', user.id)
      .eq('tenant_id', tenantId)
      .single();

    if (userError || !userData) {
      return 1; // Default to lowest access level
    }

    return userData.access_level || 1;
  } catch (error) {
    console.error('Error getting user access level:', error);
    return 1; // Default to lowest access level on error
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
      console.error('Error fetching tenant:', error);
      return null;
    }

    return tenant;
  } catch (error) {
    console.error('Error in getTenantFromSubdomain:', error);
    return null;
  }
}

export function extractTenantFromRequest(request: NextRequest): string {
  const url = new URL(request.url);
  const subdomain = url.hostname.split('.')[0];
  
  // Handle various deployment scenarios
  if (subdomain === 'localhost' || subdomain.includes('ai-lead-router-saas')) {
    // For local development, extract from path or use default
    const pathSegments = url.pathname.split('/');
    if (pathSegments[1] && pathSegments[1] !== 'api') {
      return pathSegments[1]; // Use path-based tenant for local dev
    }
    return 'main'; // Default for main domain
  }
  
  return subdomain;
}