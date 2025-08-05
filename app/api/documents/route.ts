import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCORSHeaders } from '@/lib/utils';
import { validateTenantContext } from '@/lib/api-tenant-validation';

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
    
    // 🔒 SECURE: Validate tenant context with proper security checks
    const tenantValidation = await validateTenantContext(request, {

      requireAuth: false // Set to true for production
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

    const tenantSubdomain = tenantValidation.tenantId!;
    console.log('Fetching documents for validated tenant:', tenantSubdomain);
    
    // Get the tenant UUID - use validated data if available
    let tenantId = tenantValidation.tenantData?.id;
    if (!tenantId) {
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
      tenantId = tenant.id;
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
    
    // 🔒 SECURE: Validate tenant context with proper security checks
    const tenantValidation = await validateTenantContext(request, {

      requireAuth: false // Set to true for production
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

    // Get the tenant UUID - use validated data if available
    let tenantId = tenantValidation.tenantData?.id;
    if (!tenantId) {
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .eq('subdomain', tenantValidation.tenantId!)
        .single();

      if (tenantError || !tenant) {
        console.error('Tenant not found:', tenantError);
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404, headers: corsHeaders }
        );
      }
      tenantId = tenant.id;
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
      .eq('tenant_id', tenantId);

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