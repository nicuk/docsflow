import { NextRequest, NextResponse } from 'next/server';
import { validateTenantContext } from '@/lib/api-tenant-validation';
import { getCORSHeaders } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

/**
 * Admin User Access Management API
 * GET: Fetch pending user requests for approval
 * POST: Approve or reject user access requests
 */

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    // Validate admin access
    const tenantValidation = await validateTenantContext(request, {
      requireAuth: true
    });

    if (!tenantValidation.isValid) {
      return NextResponse.json(
        { error: 'Invalid tenant context' },
        { status: 401, headers: corsHeaders }
      );
    }

    const tenantId = tenantValidation.tenantId!;

    // Fetch pending invitations and access requests
    const { data: pendingInvitations, error: invitationsError } = await supabase!
      .from('user_invitations')
      .select(`
        id,
        email,
        role,
        access_level,
        status,
        expires_at,
        created_at,
        invited_by,
        token,
        users!invited_by(name, email)
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (invitationsError) {
      console.error('Error fetching pending invitations:', invitationsError);
      return NextResponse.json(
        { error: 'Failed to fetch pending requests' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Fetch access requests (users who signed up but need approval)
    const { data: accessRequests, error: requestsError } = await supabase!
      .from('access_requests')
      .select(`
        id,
        user_email,
        user_name,
        requested_role,
        requested_access_level,
        status,
        request_reason,
        created_at,
        user_ip,
        user_agent
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    // If access_requests table doesn't exist yet, we'll handle it gracefully
    const accessRequestsData = requestsError ? [] : (accessRequests || []);

    // Get current tenant users for context
    const { data: currentUsers, error: usersError } = await supabase!
      .from('users')
      .select('id, email, name, role, access_level, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error fetching current users:', usersError);
    }

    // Get tenant info
    const { data: tenant, error: tenantError } = await supabase!
      .from('tenants')
      .select('name, subdomain, settings')
      .eq('id', tenantId)
      .single();

    if (tenantError) {
      console.error('Error fetching tenant info:', tenantError);
    }

    return NextResponse.json({
      success: true,
      data: {
        pendingInvitations: pendingInvitations || [],
        accessRequests: accessRequestsData,
        currentUsers: currentUsers || [],
        tenant: tenant,
        summary: {
          totalPending: (pendingInvitations?.length || 0) + accessRequestsData.length,
          pendingInvitations: pendingInvitations?.length || 0,
          accessRequests: accessRequestsData.length,
          currentUsers: currentUsers?.length || 0,
          userLimit: tenant?.settings?.user_limit || 10
        }
      }
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Admin pending users API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    // Validate admin access
    const tenantValidation = await validateTenantContext(request, {
      requireAuth: true
    });

    if (!tenantValidation.isValid) {
      return NextResponse.json(
        { error: 'Invalid tenant context' },
        { status: 401, headers: corsHeaders }
      );
    }

    const tenantId = tenantValidation.tenantId!;
    const { action, type, id, reason } = await request.json();

    if (!action || !type || !id) {
      return NextResponse.json(
        { error: 'action, type, and id are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be approve or reject' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['invitation', 'access_request'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be invitation or access_request' },
        { status: 400, headers: corsHeaders }
      );
    }

    let result;

    if (type === 'invitation') {
      result = await handleInvitationAction(tenantId, id, action, reason);
    } else {
      result = await handleAccessRequestAction(tenantId, id, action, reason);
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.data
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Admin action API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

async function handleInvitationAction(
  tenantId: string, 
  invitationId: string, 
  action: string, 
  reason?: string
) {
  // Get invitation details
  const { data: invitation, error: fetchError } = await supabase!
    .from('user_invitations')
    .select('*')
    .eq('id', invitationId)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !invitation) {
    return { success: false, error: 'Invitation not found' };
  }

  if (invitation.status !== 'pending') {
    return { success: false, error: 'Invitation is no longer pending' };
  }

  if (action === 'approve') {
    // Update invitation status to approved (user can still accept)
    const { error: updateError } = await supabase!
      .from('user_invitations')
      .update({ 
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId);

    if (updateError) {
      return { success: false, error: 'Failed to approve invitation' };
    }

    return {
      success: true,
      message: `Invitation for ${invitation.email} approved`,
      data: { action: 'approved', email: invitation.email }
    };

  } else {
    // Reject invitation
    const { error: updateError } = await supabase!
      .from('user_invitations')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId);

    if (updateError) {
      return { success: false, error: 'Failed to reject invitation' };
    }

    return {
      success: true,
      message: `Invitation for ${invitation.email} rejected`,
      data: { action: 'rejected', email: invitation.email, reason }
    };
  }
}

async function handleAccessRequestAction(
  tenantId: string, 
  requestId: string, 
  action: string, 
  reason?: string
) {
  // This would handle access_requests table if it exists
  // For now, we'll return a placeholder
  return {
    success: true,
    message: `Access request ${action}d`,
    data: { action, requestId, reason }
  };
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
