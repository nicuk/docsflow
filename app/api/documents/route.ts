import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get tenant from subdomain
    const url = new URL(request.url);
    const subdomain = url.hostname.split('.')[0];
    const tenantId = subdomain === 'localhost' ? 'demo' : subdomain;

    // Parse query parameters
    const searchParams = url.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    // Build query
    let query = supabase
      .from('documents')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      query = query.ilike('filename', `%${search}%`);
    }

    if (status && status !== 'all') {
      query = query.eq('processing_status', status);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: documents, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return NextResponse.json({
      documents: documents || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext,
        hasPrev
      },
      filters: {
        search,
        status
      }
    });

  } catch (error) {
    console.error('Documents API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get tenant from subdomain
    const url = new URL(request.url);
    const subdomain = url.hostname.split('.')[0];
    const tenantId = subdomain === 'localhost' ? 'demo' : subdomain;

    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Verify document belongs to tenant and delete
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Document deleted successfully',
      documentId
    });

  } catch (error) {
    console.error('Delete API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 