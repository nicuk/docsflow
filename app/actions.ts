'use server';

import { redis, safeRedisOperation } from '@/lib/redis';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { rootDomain, protocol } from '@/lib/utils';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
function getSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('Supabase not configured, falling back to Redis-only mode');
    return null;
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

interface CreateSubdomainState {
  subdomain?: string;
  organizationName?: string;
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
  const organizationNameValue = formData.get('organizationName');
  const industryValue = formData.get('industry');

  if (typeof subdomainValue !== 'string' || typeof organizationNameValue !== 'string' || typeof industryValue !== 'string') {
    return { success: false, error: 'Invalid form data' };
  }

  const subdomain = subdomainValue;
  const organizationName = organizationNameValue;
  const industry = industryValue;

  if (!subdomain || !organizationName || !industry) {
    return { success: false, error: 'All fields are required' };
  }

  const sanitizedSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

  if (sanitizedSubdomain !== subdomain) {
    return {
      subdomain,
      organizationName,
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
      organizationName,
      industry,
      success: false,
      error: 'This subdomain is already taken'
    };
  }

  try {
    // Create tenant data with organization info
    const tenantData = {
      organizationName,
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
            name: organizationName,
            industry: industry,
            settings: {
              organizationName,
              created_via: 'subdomain_form',
              demo_mode: true
            }
          })
          .select()
          .single();

        if (tenantError) {
          console.error('Supabase tenant creation failed:', tenantError);
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
          await createSampleDocuments(supabase, tenant.id, organizationName, industry);
          
          console.log(`✅ Created enterprise tenant: ${organizationName} (${tenant.id})`);
        }
      } catch (supabaseError) {
        console.error('Supabase operations failed:', supabaseError);
      }
    }

    // Redirect to the new subdomain on success
    redirect(`${protocol}://${sanitizedSubdomain}.${rootDomain}`);
  } catch (error) {
    console.error('Error creating tenant:', error);
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
    console.error('Error deleting tenant:', error);
    return { error: 'Failed to delete tenant. Please try again.' };
  }
}

// Helper function to create sample documents
async function createSampleDocuments(supabase: any, tenantId: string, organizationName: string, industry: string) {
  const sampleDocs = [
    {
      filename: 'Company Handbook.pdf',
      content: `Welcome to ${organizationName}. This handbook contains our policies, procedures, and company culture guidelines for our ${industry} organization.`,
      access_level: 2,
      processing_status: 'completed'
    },
    {
      filename: 'Operations Manual.pdf', 
      content: `Operations procedures and guidelines for ${organizationName}. Includes ${industry}-specific processes, safety guidelines, and standard operating procedures.`,
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
      console.error(`Failed to create sample document ${doc.filename}:`, error);
    }
  }
}
