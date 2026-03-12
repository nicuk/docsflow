import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCORSHeaders } from '@/lib/utils';
import { validateTenantContext } from '@/lib/api-tenant-validation';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: getCORSHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    // 🔒 SECURE: Validate tenant context with proper security checks
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

    // Use service role to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // 2-minute threshold (processing should complete within seconds)
    // Background processing should complete within seconds, so 2 minutes is plenty
    const twoMinutesAgo = new Date();
    twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2);
    
    const { data: stuckDocuments, error: fetchError } = await supabase
      .from('documents')
      .select('id, filename, created_at')
      .eq('tenant_id', tenantId) // 🔒 CRITICAL: Only clean THIS tenant's stuck files
      .eq('processing_status', 'processing')
      .lt('created_at', twoMinutesAgo.toISOString());

    if (fetchError) {
      console.error('Error fetching stuck documents:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch stuck documents' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!stuckDocuments || stuckDocuments.length === 0) {
      return NextResponse.json({
        message: 'No stuck documents found',
        cleaned: 0
      }, { headers: corsHeaders });
    }

    
    
    // Delete associated chunks first (foreign key constraint)
    const documentIds = stuckDocuments.map(doc => doc.id);
    
    if (documentIds.length > 0) {
      const { error: chunksDeleteError } = await supabase
        .from('document_chunks')
        .delete()
        .in('document_id', documentIds);

      if (chunksDeleteError) {
        console.error('Error deleting stuck document chunks:', chunksDeleteError);
        // Continue anyway - chunks might not exist
      }

      // Delete the documents themselves
      const { error: documentsDeleteError } = await supabase
        .from('documents')
        .delete()
        .in('id', documentIds);

      if (documentsDeleteError) {
        console.error('Error deleting stuck documents:', documentsDeleteError);
        return NextResponse.json(
          { error: 'Failed to delete stuck documents' },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    return NextResponse.json({
      message: `Successfully cleaned up ${stuckDocuments.length} stuck documents`,
      cleaned: stuckDocuments.length,
      documents: stuckDocuments.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        stuckSince: doc.created_at
      }))
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Cleanup stuck documents error:', error);
    return NextResponse.json(
      { error: 'Internal server error during cleanup' },
      { status: 500, headers: corsHeaders }
    );
  }
}
