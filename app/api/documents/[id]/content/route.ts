import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateTenantContext } from '@/lib/api-tenant-validation';
import { getCORSHeaders } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);
  const params = await context.params;
  
  try {
    // Validate tenant context
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

    const tenantId = tenantValidation.tenantId!;
    const documentId = params.id;

    // Initialize Supabase client
    // SECURITY FIX: Use secure database service
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Set tenant context for RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // Get document metadata first to ensure it exists and user has access
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, filename, file_size, mime_type, tenant_id')
      .eq('id', documentId)
      .eq('tenant_id', tenantId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get all chunks for this document to reconstruct full content
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('content, chunk_index, metadata')
      .eq('document_id', documentId)
      .eq('tenant_id', tenantId)
      .order('chunk_index', { ascending: true });

    if (chunksError) {
      console.error('Error fetching document chunks:', chunksError);
      return NextResponse.json(
        { error: 'Failed to retrieve document content' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!chunks || chunks.length === 0) {
      return NextResponse.json(
        { error: 'Document content not available' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Reconstruct full document content from chunks
    const fullContent = chunks
      .map(chunk => chunk.content)
      .join('\n\n'); // Join chunks with double newlines for readability

    console.log(`📄 [Document Content] ✅ Retrieved ${chunks.length} chunks for document ${documentId}`);

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        mime_type: document.mime_type,
        file_size: document.file_size
      },
      content: fullContent,
      chunks_count: chunks.length,
      metadata: {
        tenant_id: tenantId,
        retrieved_at: new Date().toISOString()
      }
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Document content API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to retrieve document content'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new Response(null, { status: 200, headers: getCORSHeaders(origin) });
}

