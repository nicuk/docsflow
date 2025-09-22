import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCORSHeaders } from '@/lib/utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    // Find documents that have been processing for more than 10 minutes
    const tenMinutesAgo = new Date();
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);
    
    const { data: stuckDocuments, error: fetchError } = await supabase
      .from('documents')
      .select('id, filename, created_at')
      .eq('processing_status', 'processing')
      .lt('created_at', tenMinutesAgo.toISOString());

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

    // 🎯 SURGICAL FIX: DELETE stuck documents instead of just marking as error
    console.log(`🗑️ Deleting ${stuckDocuments.length} stuck documents that failed processing...`);
    
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
      } else {
        console.log(`🧩 Deleted chunks for ${documentIds.length} stuck documents`);
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

    console.log(`✅ Cleaned up ${stuckDocuments.length} stuck documents`);
    
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
