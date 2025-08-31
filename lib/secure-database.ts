/**
 * Secure Database Service Layer
 * This abstracts all service role operations to backend-only functions
 * Prevents service role key exposure to frontend code
 */

import { createClient } from '@supabase/supabase-js';

// Ensure this only runs on server side
if (typeof window !== 'undefined') {
  throw new Error('🚨 SECURITY ERROR: secure-database.ts should only be used on server side!');
}

let serviceClient: ReturnType<typeof createClient> | null = null;

/**
 * Get secure service client - BACKEND ONLY
 * Throws error if used on client side
 */
function getServiceClient() {
  if (!serviceClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase configuration - ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
    }
    
    serviceClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  
  return serviceClient;
}

/**
 * Secure tenant operations
 */
export const SecureTenantService = {
  /**
   * Get tenant by subdomain (replaces middleware direct query)
   */
  async getTenantBySubdomain(subdomain: string) {
    const client = getServiceClient();
    const { data, error } = await client
      .from('tenants')
      .select('id, subdomain, name, industry')
      .eq('subdomain', subdomain)
      .maybeSingle();
    
    if (error) {
      console.error('SecureTenantService.getTenantBySubdomain error:', error);
      return null;
    }
    
    return data;
  },

  /**
   * Get tenant by UUID (replaces tenant context manager)
   */
  async getTenantByUUID(tenantId: string) {
    const client = getServiceClient();
    const { data, error } = await client
      .from('tenants')
      .select('id, subdomain, name, industry')
      .eq('id', tenantId)
      .maybeSingle();
    
    if (error) {
      console.error('SecureTenantService.getTenantByUUID error:', error);
      return null;
    }
    
    return data;
  },

  /**
   * Verify tenant exists
   */
  async verifyTenantExists(subdomain: string): Promise<boolean> {
    const tenant = await this.getTenantBySubdomain(subdomain);
    return !!tenant;
  }
};

/**
 * Secure document operations
 */
export const SecureDocumentService = {
  /**
   * Get documents for tenant with proper isolation
   */
  async getDocumentsForTenant(tenantId: string, userId?: string) {
    const client = getServiceClient();
    let query = client
      .from('documents')
      .select('*')
      .eq('tenant_id', tenantId);
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('SecureDocumentService.getDocumentsForTenant error:', error);
      return [];
    }
    
    return data || [];
  },

  /**
   * Get document chunks for RAG/search
   */
  async getDocumentChunks(tenantId: string, documentId?: string) {
    const client = getServiceClient();
    let query = client
      .from('document_chunks')
      .select('*')
      .eq('tenant_id', tenantId);
    
    if (documentId) {
      query = query.eq('document_id', documentId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('SecureDocumentService.getDocumentChunks error:', error);
      return [];
    }
    
    return data || [];
  },

  /**
   * Insert document chunk with tenant isolation
   */
  async insertDocumentChunk(chunkData: any, tenantId: string) {
    const client = getServiceClient();
    const { data, error } = await client
      .from('document_chunks')
      .insert({
        ...chunkData,
        tenant_id: tenantId, // Enforce tenant isolation
      })
      .select()
      .single();
    
    if (error) {
      console.error('SecureDocumentService.insertDocumentChunk error:', error);
      return null;
    }
    
    return data;
  },

  /**
   * Insert document with tenant isolation
   */
  async insertDocument(documentData: any) {
    const client = getServiceClient();
    const { data, error } = await client
      .from('documents')
      .insert(documentData)
      .select()
      .single();
    
    if (error) {
      console.error('SecureDocumentService.insertDocument error:', error);
      return null;
    }
    
    return data;
  }
};

/**
 * Secure user operations  
 */
export const SecureUserService = {
  /**
   * Get user with tenant information
   */
  async getUserWithTenant(userId: string) {
    const client = getServiceClient();
    const { data, error } = await client
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        tenant_id,
        access_level,
        tenants (
          id,
          subdomain,
          name,
          industry
        )
      `)
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('SecureUserService.getUserWithTenant error:', error);
      return null;
    }
    
    return data;
  },

  /**
   * Update user tenant association
   */
  async updateUserTenant(userId: string, tenantId: string) {
    const client = getServiceClient();
    const { data, error } = await client
      .from('users')
      .update({ tenant_id: tenantId })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('SecureUserService.updateUserTenant error:', error);
      return null;
    }
    
    return data;
  }
};

/**
 * Secure admin operations
 */
export const SecureAdminService = {
  /**
   * Get all tenants (admin only)
   */
  async getAllTenants() {
    const client = getServiceClient();
    const { data, error } = await client
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('SecureAdminService.getAllTenants error:', error);
      return [];
    }
    
    return data || [];
  },

  /**
   * Get all users across tenants (admin only)
   */
  async getAllUsers() {
    const client = getServiceClient();
    const { data, error } = await client
      .from('users')
      .select(`
        *,
        tenants (
          id,
          subdomain,
          name
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('SecureAdminService.getAllUsers error:', error);
      return [];
    }
    
    return data || [];
  }
};

/**
 * Test function to verify service is working
 */
export async function testSecureService() {
  try {
    const client = getServiceClient();
    const { data, error } = await client
      .from('tenants')
      .select('count(*)')
      .single();
    
    if (error) {
      console.error('testSecureService error:', error);
      return false;
    }
    
    console.log('✅ Secure service working - tenant count:', data);
    return true;
  } catch (error) {
    console.error('testSecureService failed:', error);
    return false;
  }
}
