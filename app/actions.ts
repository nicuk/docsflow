'use server';

import { redis, safeRedisOperation } from '@/lib/redis';
import { isValidIcon } from '@/lib/subdomains';
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
  icon?: string;
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
  const iconValue = formData.get('icon');

  if (typeof subdomainValue !== 'string' || typeof iconValue !== 'string') {
    return { success: false, error: 'Invalid form data' };
  }

  const subdomain = subdomainValue;
  const icon = iconValue;

  if (!subdomain || !icon) {
    return { success: false, error: 'Subdomain and icon are required' };
  }

  if (!isValidIcon(icon)) {
    return {
      subdomain,
      icon,
      success: false,
      error: 'Please enter a valid emoji (maximum 10 characters)'
    };
  }

  const sanitizedSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

  if (sanitizedSubdomain !== subdomain) {
    return {
      subdomain,
      icon,
      success: false,
      error:
        'Subdomain can only have lowercase letters, numbers, and hyphens. Please try again.'
    };
  }

  const subdomainAlreadyExists = await safeRedisOperation(
    () => redis!.get(`subdomain:${sanitizedSubdomain}`),
    null
  );
  if (subdomainAlreadyExists) {
    return {
      subdomain,
      icon,
      success: false,
      error: 'This subdomain is already taken'
    };
  }

  // BRIDGE FIX: Create both Redis AND Supabase tenant
  const tenantData = {
    emoji: icon,
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

  // Step 1: Create Redis entry (existing functionality)
  await safeRedisOperation(
    () => redis!.set(`subdomain:${sanitizedSubdomain}`, tenantData),
    undefined
  );

  // Step 2: BRIDGE TO SUPABASE - Create enterprise tenant
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      // Create tenant in Supabase
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          subdomain: sanitizedSubdomain,
          name: `${sanitizedSubdomain} Organization`,
          industry: 'general',
          settings: {
            emoji: icon,
            created_via: 'subdomain_form',
            demo_mode: true
          }
        })
        .select()
        .single();

      if (tenantError) {
        console.error('Supabase tenant creation failed:', tenantError);
        // Continue with Redis-only mode
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
        await createSampleDocuments(supabase, tenant.id, sanitizedSubdomain);
        
        console.log(`✅ Created enterprise tenant: ${sanitizedSubdomain} (${tenant.id})`);
      }
    } catch (supabaseError) {
      console.error('Supabase operations failed:', supabaseError);
      // Continue with Redis-only mode
    }
  }

  // Redirect to main domain with subdomain parameter instead of subdomain URL
  redirect(`${protocol}://${rootDomain}/s/${sanitizedSubdomain}`);
}

export async function deleteSubdomainAction(
  prevState: DeleteSubdomainState,
  formData: FormData
): Promise<DeleteSubdomainState> {
  const subdomainValue = formData.get('subdomain');
  
  if (typeof subdomainValue !== 'string') {
    return { error: 'Invalid subdomain' };
  }

  await safeRedisOperation(
    () => redis!.del(`subdomain:${subdomainValue}`),
    undefined
  );
  revalidatePath('/admin');
  return { success: 'Domain deleted successfully' };
}

// Helper function to create sample documents for instant demo value
async function createSampleDocuments(supabase: any, tenantId: string, subdomain: string) {
  const sampleDocs = [
    {
      filename: 'Company Handbook.pdf',
      content: `Welcome to ${subdomain} Organization. This handbook contains our policies, procedures, and company culture guidelines.`,
      access_level: 2,
      processing_status: 'completed'
    },
    {
      filename: 'Technical Manual.pdf', 
      content: `Technical procedures and safety guidelines for ${subdomain}. Includes equipment operation, maintenance schedules, and troubleshooting guides.`,
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
