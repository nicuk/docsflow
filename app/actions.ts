'use server';

import { redis, safeRedisOperation } from '@/lib/redis';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { rootDomain, protocol } from '@/lib/utils';
import { createClient } from '@supabase/supabase-js';

import { SecureDocumentService, SecureTenantService, SecureUserService } from '@/lib/secure-database';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface CreateSubdomainState {
  subdomain?: string;
  displayName?: string;
  industry?: string;
  success?: boolean;
  error?: string;
}

interface DeleteSubdomainState {
  success?: string;
  error?: string;
}

export async function createSubdomainAction(
  prevState: CreateSubdomainState,
  formData: FormData
): Promise<CreateSubdomainState> {
  const subdomainValue = formData.get('subdomain');
  const displayNameValue = formData.get('displayName');
  const industryValue = formData.get('industry');

  if (typeof subdomainValue !== 'string' || typeof displayNameValue !== 'string' || typeof industryValue !== 'string') {
    return { success: false, error: 'Invalid form data' };
  }

  const subdomain = subdomainValue;
  const displayName = displayNameValue;
  const industry = industryValue;

  if (!subdomain || !displayName || !industry) {
    return { success: false, error: 'All fields are required' };
  }

  const sanitizedSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

  if (sanitizedSubdomain !== subdomain) {
    return {
      subdomain,
      displayName,
      industry,
      success: false,
      error: 'Subdomain can only have lowercase letters, numbers, and hyphens. Please try again.'
    };
  }

  const subdomainAlreadyExists = await safeRedisOperation(
    () => redis!.get(`subdomain:${sanitizedSubdomain}`),
    null
  );
  if (subdomainAlreadyExists) {
    return {
      subdomain,
      displayName,
      industry,
      success: false,
      error: 'This subdomain is already taken'
    };
  }

  try {
    // Create tenant data with organization info
    const tenantData = {
      displayName,
      industry,
      createdAt: Date.now(),
      leadCount: 0,
      lastActivity: Date.now(),
      aiEnabled: true,
      subscriptionTier: 'trial',
      settings: {
        created_via: 'subdomain_form',
        demo_mode: true
      }
    };

    // Step 1: Create Redis entry
    await safeRedisOperation(
      () => redis!.set(`subdomain:${sanitizedSubdomain}`, tenantData),
      undefined
    );

    // Step 2: Create Supabase tenant
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // Create tenant in Supabase
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .insert({
            subdomain: sanitizedSubdomain,
            name: displayName,
            industry: industry,
            settings: {
              displayName,
              created_via: 'subdomain_form',
              demo_mode: true
            }
          })
          .select()
          .single();

        if (tenantError) {
          // Tenant creation failed, skip demo setup
        } else {
          // Create default demo user for this tenant
          await supabase
            .from('users')
            .insert({
              tenant_id: tenant.id,
              email: `demo@${sanitizedSubdomain}.local`,
              access_level: 3, // Technician level for demo
              role: 'demo_user',
              is_demo_user: true
            });

          // Add sample documents for instant demo value
          await createSampleDocuments(supabase, tenant.id, displayName, industry);
          
          // Tenant created successfully
        }
      } catch (supabaseError) {
        // Supabase operations failed
      }
    }

    // Redirect to the new subdomain on success
    redirect(`${protocol}://${sanitizedSubdomain}.${rootDomain}`);
  } catch (error) {
    return { error: 'Failed to create organization. Please try again.' };
  }
}

export async function deleteSubdomainAction(
  prevState: DeleteSubdomainState,
  formData: FormData
): Promise<DeleteSubdomainState> {
  const subdomainValue = formData.get('subdomain');
  
  if (typeof subdomainValue !== 'string') {
    return { error: 'Invalid subdomain' };
  }

  try {
    // Call the DELETE API endpoint that removes tenant from both Redis and Supabase
    const response = await fetch(`/api/tenants/${subdomainValue}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const result = await response.json();
      return { error: result.error || 'Failed to delete tenant' };
    }

    const result = await response.json();
    revalidatePath('/admin');
    
    if (result.success) {
      return { success: result.message || 'Tenant deleted successfully' };
    } else {
      return { error: result.error || 'Failed to delete tenant' };
    }
  } catch (error) {
    return { error: 'Failed to delete tenant. Please try again.' };
  }
}

// Helper function to create sample documents
async function createSampleDocuments(supabase: any, tenantId: string, displayName: string, industry: string) {
  const sampleDocs = [
    {
      filename: 'Company Handbook.pdf',
      content: `Welcome to ${displayName}. This handbook contains our policies, procedures, and company culture guidelines for our ${industry} organization.`,
      access_level: 2,
      processing_status: 'completed'
    },
    {
      filename: 'Operations Manual.pdf', 
      content: `Operations procedures and guidelines for ${displayName}. Includes ${industry}-specific processes, safety guidelines, and standard operating procedures.`,
      access_level: 3,
      processing_status: 'completed'
    }
  ];

  for (const doc of sampleDocs) {
    try {
      // Insert document
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          tenant_id: tenantId,
          filename: doc.filename,
          file_size: doc.content.length,
          mime_type: 'application/pdf',
          access_level: doc.access_level,
          processing_status: doc.processing_status,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (!docError && document) {
        // Create a simple chunk for the sample document
        await supabase
          .from('document_chunks')
          .insert({
            document_id: document.id,
            tenant_id: tenantId,
            chunk_index: 0,
            content: doc.content,
            embedding: new Array(768).fill(0.1), // Simple placeholder embedding
            access_level: doc.access_level,
            metadata: {
              tenant_id: tenantId,
              chunk_length: doc.content.length,
              document_type: 'PDF Document',
              sample_document: true
            }
          });
      }
    } catch (error) {
      // Sample document creation failed
    }
  }
}
