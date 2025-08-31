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
    // SUPABASE SSR FIX: Use server client with fallback
    console.log('🔧 [DOCUMENTS API] Creating Supabase client...');
    let supabase;
    
    try {
      supabase = await createClient();
      console.log('✅ [DOCUMENTS API] Server client created successfully');
    } catch (serverClientError) {
      console.warn('⚠️ [DOCUMENTS API] Server client failed, using direct client:', serverClientError);
      // Fallback to direct client if server client fails
      supabase = createDirectClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
    
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
    
    // tenantId is already the UUID from validation, no need for additional lookup
    
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
    // SUPABASE SSR FIX: Use server client for proper authentication
    const supabase = await createClient();
    
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