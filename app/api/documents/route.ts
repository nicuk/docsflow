import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCORSHeaders } from '@/lib/utils';

function getSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: getCORSHeaders(origin) });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);
  
  try {
    const supabase = getSupabaseClient();
    
    // Get tenant from subdomain or demo mode
    const tenantSubdomain = request.headers.get('X-Tenant-Subdomain') || 'demo-warehouse-dist';
    
    console.log('Fetching documents for tenant subdomain:', tenantSubdomain);
    
    // First, get the tenant UUID from subdomain
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', tenantSubdomain)
      .single();

    if (tenantError || !tenant) {
      console.error('Tenant not found:', tenantError);
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404, headers: corsHeaders }
      );
    }
    
    // Get documents for this tenant using the actual UUID
    const { data: documents, error } = await supabase
      .from('documents')
      .select(`
        id,
        filename,
        file_type,
        file_size,
        processing_status,
        access_level,
        created_at,
        tenant_id
      `)
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Documents fetch error:', error);
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
    const supabase = getSupabaseClient();
    
    // Get tenant from headers (consistent with other routes)
    const tenantSubdomain = request.headers.get('X-Tenant-Subdomain') || 'demo-warehouse-dist';
    
    // Get the tenant UUID from subdomain
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', tenantSubdomain)
      .single();

    if (tenantError || !tenant) {
      console.error('Tenant not found:', tenantError);
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify document belongs to tenant and delete
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('tenant_id', tenant.id);

    if (error) {
      console.error('Delete error:', error);
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
    console.error('Delete API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
} 