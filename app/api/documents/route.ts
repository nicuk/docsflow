import { NextRequest, NextResponse } from 'next/server';
import { getCORSHeaders } from '@/lib/utils';
import { validateTenantContext } from '@/lib/api-tenant-validation';
import { createClient } from '@/lib/supabase-server';
import { createClient as createDirectClient } from '@supabase/supabase-js';

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
    // 🎯 CLERK MIGRATION: Use service role key to bypass RLS
    // Authentication is handled by validateTenantContext (Clerk)
    // Supabase is only used as a database, not for auth
    console.log('🔧 [DOCUMENTS API] Creating Supabase client with service role...');
    const supabase = createDirectClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role bypasses RLS
    );
    console.log('✅ [DOCUMENTS API] Service role client created');
    
    // 🔒 SECURE: Validate tenant context with proper security checks
    const tenantValidation = await validateTenantContext(request, {

      requireAuth: true // ✅ PRODUCTION: Authentication enabled
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

    const tenantId = tenantValidation.tenantId!; // This is already the UUID
    const tenantSubdomain = tenantValidation.tenantData?.subdomain || 'unknown';
    console.log('Fetching documents for validated tenant:', tenantSubdomain, 'UUID:', tenantId);
    
    // 🎯 CLERK MIGRATION: Authentication is handled by validateTenantContext
    // No need to set Supabase session - we query by tenant_id directly
    console.log('✅ [DOCUMENTS API] Using tenant-scoped queries (no session needed)');
    
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
      console.error('Documents fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch documents' }, 
        { status: 500, headers: corsHeaders }
      );
    }

    // 🔧 PERFORMANCE: Only log count, not full document list (scales to 100+ files)
    console.log(`📋 [DOCUMENTS API] Found ${documents?.length || 0} documents for tenant ${tenantId}`);
    
    // Only log details in development or when debugging
    if (process.env.NODE_ENV === 'development' && documents && documents.length > 0) {
      console.log('📄 [DOCUMENTS API] Sample (first 3):', documents.slice(0, 3).map(d => ({ filename: d.filename, id: d.id?.substring(0, 8) + '...' })));
    }

    return NextResponse.json(
      { documents: documents || [] },
      { headers: corsHeaders }
    );
    
  } catch (error) {
    console.error('Documents API error:', error);
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
    // 🔒 SECURE: Validate tenant context with proper security checks
    const tenantValidation = await validateTenantContext(request, {
      requireAuth: true // ✅ PRODUCTION: Authentication enabled
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

    console.log(`🗑️ [DELETE] Deleting document ${documentId} for tenant ${tenantId}`);

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

    // 1. Delete file from storage
    const storagePath = document.metadata?.storage_path;
    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([storagePath]);
      
      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Continue anyway - file might already be deleted
      } else {
        console.log(`📁 [DELETE] Deleted file from storage: ${storagePath}`);
      }
    }

    // 2. Delete vectors from Pinecone
    try {
      const { deleteWorkflow } = await import('@/lib/rag');
      await deleteWorkflow({ documentId, tenantId });
      console.log(`🗃️  [DELETE] Deleted vectors from Pinecone`);
    } catch (pineconeError) {
      console.error('Error deleting from Pinecone:', pineconeError);
      // Continue anyway - vectors might not exist
    }

    // 3. Delete related ingestion jobs
    const { error: jobsDeleteError } = await supabase
      .from('ingestion_jobs')
      .delete()
      .eq('document_id', documentId);

    if (jobsDeleteError) {
      console.error('Error deleting ingestion jobs:', jobsDeleteError);
      // Continue anyway - jobs might not exist
    } else {
      console.log(`📋 [DELETE] Deleted ingestion jobs for document`);
    }

    // 4. Delete chunks from database (old system)
    const { error: chunksDeleteError } = await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId);

    if (chunksDeleteError) {
      console.error('Error deleting document chunks:', chunksDeleteError);
      // Continue anyway - chunks might not exist
    } else {
      console.log(`🧩 [DELETE] Deleted chunks from database`);
    }

    // 5. Finally, delete document record
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('tenant_id', tenantId); // 🔒 CRITICAL: Ensure tenant isolation

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`✅ [DELETE] Successfully deleted document ${documentId} (including file, vectors, jobs, and chunks)`);

    return NextResponse.json({
      message: 'Document deleted successfully',
      documentId
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Delete API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
} 