import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendWelcomeEmail } from '@/lib/email';

interface PendingUsersData {
  summary: {
    totalPending: number;
    pendingInvitations: number;
    pendingRequests: number;
  };
  invitations: Array<{
    id: string;
    email: string;
    role: string;
    access_level: number;
    status: string;
    created_at: string;
    expires_at: string;
  }>;
  accessRequests: Array<{
    id: string;
    email: string;
    requested_role: string;
    requested_access_level: number;
    reason: string;
    status: string;
    created_at: string;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    // Get tenant context from headers
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    // Verify admin access
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile } = await supabase!
      .from('users')
      .select('role, access_level')
      .eq('id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (!userProfile || userProfile.role !== 'admin' || userProfile.access_level !== 1) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get pending invitations
    const { data: invitations, error: invitationsError } = await supabase!
      .from('user_invitations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError);
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }

    // Get pending access requests
    const { data: accessRequests, error: requestsError } = await supabase!
      .from('access_requests')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('Error fetching access requests:', requestsError);
      // Don't fail if access_requests table doesn't exist yet
    }

    const pendingData: PendingUsersData = {
      summary: {
        totalPending: (invitations?.length || 0) + (accessRequests?.length || 0),
        pendingInvitations: invitations?.length || 0,
        pendingRequests: accessRequests?.length || 0,
      },
      invitations: invitations || [],
      accessRequests: accessRequests || []
    };

    return NextResponse.json({
      success: true,
      data: pendingData
    });

  } catch (error) {
    console.error('Error in pending-users GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, type, id, reason } = await request.json();

    // Get tenant context
    const tenantId = request.headers.get('x-tenant-id');
    const userId = request.headers.get('x-user-id');

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'Missing tenant or user context' }, { status: 400 });
    }

    // Verify admin access
    const { data: userProfile } = await supabase!
      .from('users')
      .select('role, access_level')
      .eq('id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (!userProfile || userProfile.role !== 'admin' || userProfile.access_level !== 1) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (type === 'invitation') {
      return await handleInvitationAction(action, id, reason, tenantId, userId);
    } else if (type === 'access_request') {
      return await handleAccessRequestAction(action, id, reason, tenantId, userId);
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

  } catch (error) {
    console.error('Error in pending-users POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleInvitationAction(action: string, invitationId: string, reason: string, tenantId: string, adminId: string) {
  if (action === 'approve') {
    // Get invitation details
    const { data: invitation } = await supabase!
      .from('user_invitations')
      .select('*, tenants(name, subdomain)')
      .eq('id', invitationId)
      .single();

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Update invitation status
    const { error: updateError } = await supabase!
      .from('user_invitations')
      .update({ 
        status: 'approved',
        approved_by: adminId,
        approved_at: new Date().toISOString()
      })
      .eq('id', invitationId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to approve invitation' }, { status: 500 });
    }

    // Send approval email
    await sendWelcomeEmail({
      email: invitation.email,
      name: invitation.email.split('@')[0],
      tenantName: (invitation.tenants as any).name,
      dashboardUrl: `https://${(invitation.tenants as any).subdomain}.docsflow.app/dashboard`
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Invitation approved successfully' 
    });

  } else if (action === 'reject') {
    const { error } = await supabase!
      .from('user_invitations')
      .update({ 
        status: 'rejected',
        rejected_by: adminId,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason
      })
      .eq('id', invitationId);

    if (error) {
      return NextResponse.json({ error: 'Failed to reject invitation' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Invitation rejected' 
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

async function handleAccessRequestAction(action: string, requestId: string, reason: string, tenantId: string, adminId: string) {
  if (action === 'approve') {
    // Get access request details
    const { data: accessRequest } = await supabase!
      .from('access_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!accessRequest) {
      return NextResponse.json({ error: 'Access request not found' }, { status: 404 });
    }

    // Create user invitation
    const invitationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const { error: inviteError } = await supabase!
      .from('user_invitations')
      .insert({
        tenant_id: tenantId,
        email: accessRequest.email,
        role: accessRequest.requested_role,
        access_level: accessRequest.requested_access_level,
        token: invitationToken,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        invited_by: adminId
      });

    if (inviteError) {
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    // Update access request status
    const { error: updateError } = await supabase!
      .from('access_requests')
      .update({ 
        status: 'approved',
        approved_by: adminId,
        approved_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Failed to update access request:', updateError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Access request approved and invitation sent' 
    });

  } else if (action === 'reject') {
    const { error } = await supabase!
      .from('access_requests')
      .update({ 
        status: 'rejected',
        rejected_by: adminId,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason
      })
      .eq('id', requestId);

    if (error) {
      return NextResponse.json({ error: 'Failed to reject access request' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Access request rejected' 
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
