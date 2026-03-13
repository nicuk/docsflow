import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { validateTenantContext } from '@/lib/api-tenant-validation';
import { verifyTenantAdmin } from '@/lib/auth/admin-verification';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    
    // Validate tenant context
    const tenantValidation = await validateTenantContext(request, {
      requireAuth: true,
    });

    if (!tenantValidation.isValid) {
      return NextResponse.json(
        { error: tenantValidation.error },
        { status: tenantValidation.statusCode || 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Get current user and verify admin access
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Verify admin access
    const adminVerification = await verifyTenantAdmin(user.id, tenantId);
    if (!adminVerification.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get SAML configuration for the tenant
    const { data: samlConfig, error } = await supabase
      .from('tenant_saml_configs')
      .select(`
        id,
        tenant_id,
        idp_entity_id,
        idp_sso_url,
        idp_metadata_url,
        sp_entity_id,
        sp_acs_url,
        sp_sls_url,
        name_id_format,
        want_assertions_signed,
        want_name_id,
        allow_unencrypted_assertions,
        attribute_mapping,
        auto_provision_users,
        default_role,
        default_access_level,
        is_enabled,
        is_configured,
        created_at,
        updated_at
      `)
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return NextResponse.json(
        { error: 'Failed to fetch SAML configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      samlConfig: samlConfig || null,
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    
    // Validate tenant context
    const tenantValidation = await validateTenantContext(request, {
      requireAuth: true,
    });

    if (!tenantValidation.isValid) {
      return NextResponse.json(
        { error: tenantValidation.error },
        { status: tenantValidation.statusCode || 400 }
      );
    }

    const body = await request.json();
    const {
      idp_entity_id,
      idp_sso_url,
      idp_certificate,
      idp_metadata_url,
      sp_entity_id,
      name_id_format,
      want_assertions_signed,
      want_name_id,
      allow_unencrypted_assertions,
      attribute_mapping,
      auto_provision_users,
      default_role,
      default_access_level,
      is_enabled,
    } = body;

    // Validate required fields
    if (!idp_entity_id || !idp_sso_url || !idp_certificate) {
      return NextResponse.json(
        { error: 'Missing required SAML configuration fields' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Get current user and verify admin access
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Verify admin access
    const adminVerification = await verifyTenantAdmin(user.id, tenantId);
    if (!adminVerification.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Check if configuration already exists
    const { data: existingConfig } = await supabase
      .from('tenant_saml_configs')
      .select('id')
      .eq('tenant_id', tenantId)
      .single();

    const configData = {
      tenant_id: tenantId,
      idp_entity_id,
      idp_sso_url,
      idp_certificate,
      idp_metadata_url: idp_metadata_url || null,
      sp_entity_id: sp_entity_id || 'docsflow-app',
      sp_acs_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/saml/callback/${tenantId}`,
      sp_sls_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/saml/logout/${tenantId}`,
      name_id_format: name_id_format || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      want_assertions_signed: want_assertions_signed !== false,
      want_name_id: want_name_id !== false,
      allow_unencrypted_assertions: allow_unencrypted_assertions === true,
      attribute_mapping: attribute_mapping || {
        email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
        firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
        lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
        displayName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'
      },
      auto_provision_users: auto_provision_users !== false,
      default_role: default_role || 'user',
      default_access_level: default_access_level || 2,
      is_enabled: is_enabled === true,
      is_configured: true,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existingConfig) {
      // Update existing configuration
      const { data, error } = await supabase
        .from('tenant_saml_configs')
        .update(configData)
        .eq('id', existingConfig.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Failed to update SAML configuration' },
          { status: 500 }
        );
      }
      result = data;
    } else {
      // Create new configuration
      const { data, error } = await supabase
        .from('tenant_saml_configs')
        .insert({
          ...configData,
          created_by: user.id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Failed to create SAML configuration' },
          { status: 500 }
        );
      }
      result = data;
    }

    return NextResponse.json({
      message: 'SAML configuration saved successfully',
      samlConfig: result,
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    
    // Validate tenant context
    const tenantValidation = await validateTenantContext(request, {
      requireAuth: true,
    });

    if (!tenantValidation.isValid) {
      return NextResponse.json(
        { error: tenantValidation.error },
        { status: tenantValidation.statusCode || 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Get current user and verify admin access
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Verify admin access
    const adminVerification = await verifyTenantAdmin(user.id, tenantId);
    if (!adminVerification.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Delete SAML configuration
    const { error } = await supabase
      .from('tenant_saml_configs')
      .delete()
      .eq('tenant_id', tenantId);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete SAML configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'SAML configuration deleted successfully',
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}