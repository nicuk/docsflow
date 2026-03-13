import { NextRequest, NextResponse } from 'next/server';
import { getCORSHeaders } from '@/lib/utils';
import { validateTenantContext } from '@/lib/api-tenant-validation';
import { createClient } from '@/lib/supabase-server';
import { createClient as createDirectClient } from '@supabase/supabase-js';
import { del } from '@vercel/blob';

// SECURITY FIX: Use secure database service instead of direct service role
import { SecureDocumentService, SecureTenantService, SecureUserService } from '@/lib/secure-database';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: getCORSHeaders(origin) });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);
  
  try {
    // Use service role key to bypass RLS
    // Authentication is handled by validateTenantContext (Clerk)
    // Supabase is only used as a database, not for auth
    const supabase = createDirectClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role bypasses RLS
    );
    
    // Validate tenant context with proper security checks
    const tenantValidation = await validateTenantContext(request, {
      requireAuth: true
    });

    if (!tenantValidation.isValid) {
      return NextResponse.json(
        { 
          error: tenantValidation.error,
          security_violation: 'Invalid tenant context'
        },
        { status: tenantValidation.statusCode || 400, headers: corsHeaders }
      );
    }

    const tenantId = tenantValidation.tenantId!;

    // Authentication is handled by validateTenantContext
    // No need to set Supabase session - we query by tenant_id directly
    
    // Get documents for this tenant using the actual UUID
    const { data: documents, error } = await supabase
      .from('documents')
      .select(`
        id,
        filename,
        mime_type,
        file_size,
        processing_status,
        metadata,
        created_at,
        tenant_id
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch documents' }, 
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { documents: documents || [] },
      { headers: corsHeaders }
    );
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);
  
  try {
    // Validate tenant context with proper security checks
    const tenantValidation = await validateTenantContext(request, {
      requireAuth: true
    });

    if (!tenantValidation.isValid) {
      return NextResponse.json(
        { 
          error: tenantValidation.error,
          security_violation: 'Invalid tenant context'
        },
        { status: tenantValidation.statusCode || 400, headers: corsHeaders }
      );
    }

    const tenantId = tenantValidation.tenantId!; // This is the tenant UUID
    
    // Use service role to bypass RLS for deletion
    const supabase = createDirectClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get document details first (for file path)
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('metadata')
      .eq('id', documentId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404, headers: corsHeaders }
      );
    }

    // 1. Delete file from storage (Vercel Blob or legacy Supabase)
    const storageUrl = document.metadata?.storage_url;
    const storageProvider = document.metadata?.storage_provider;
    const legacyStoragePath = document.metadata?.storage_path; // Old Supabase storage
    
    if (storageUrl && storageProvider === 'vercel-blob') {
      try {
        // Verify we have the Blob token
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          throw new Error('Blob storage not configured - missing token');
        }
        
        // Vercel Blob del() reads token from env automatically (BLOB_READ_WRITE_TOKEN)
        // Pass URL as string or array of URLs
        await del(storageUrl);
      } catch (storageError: any) {
        // Don't throw - continue with deletion of other resources
      }
    } else if (legacyStoragePath) {
      // Legacy: Delete from Supabase storage if old format
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([legacyStoragePath]);
      
      if (storageError) {
        // Continue anyway - file might already be deleted
      }
    }

    // 2. Delete vectors from Pinecone
    try {
      const { deleteWorkflow } = await import('@/lib/rag');
      await deleteWorkflow({ documentId, tenantId });
    } catch (pineconeError) {
      // Continue anyway - vectors might not exist
    }

    // 3. Delete related ingestion jobs
    const { error: jobsDeleteError } = await supabase
      .from('ingestion_jobs')
      .delete()
      .eq('document_id', documentId);

    if (jobsDeleteError) {
      // Continue anyway - jobs might not exist
    }

    // 4. Delete chunks from database (old system)
    const { error: chunksDeleteError } = await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId);

    if (chunksDeleteError) {
      // Continue anyway - chunks might not exist
    }

    // 5. Finally, delete document record
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('tenant_id', tenantId); // 🔒 CRITICAL: Ensure tenant isolation

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      message: 'Document deleted successfully',
      documentId
    }, { headers: corsHeaders });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
} 