import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Invitation token is required'
      }, { status: 400 });
    }

    // Clean up expired invitations first
    await supabase!.rpc('cleanup_expired_invitations');

    // Get invitation details
    const { data: invitation, error } = await supabase!
      .from('user_invitations')
      .select(`
        id,
        email,
        role,
        access_level,
        expires_at,
        status,
        created_at,
        tenant_id,
        tenants!inner(
          id,
          name,
          subdomain,
          industry,
          logo_url
        ),
        invited_by:users(
          name,
          email
        )
      `)
      .eq('token', token)
      .single();

    if (error || !invitation) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired invitation token'
      }, { status: 404 });
    }

    // Check if invitation has expired
    if (invitation.status === 'expired' || new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({
        success: false,
        error: 'This invitation has expired'
      }, { status: 410 }); // 410 Gone
    }

    // Check if invitation has already been accepted
    if (invitation.status === 'accepted') {
      return NextResponse.json({
        success: false,
        error: 'This invitation has already been accepted'
      }, { status: 409 }); // 409 Conflict
    }

    // Check if invitation has been revoked
    if (invitation.status === 'revoked') {
      return NextResponse.json({
        success: false,
        error: 'This invitation has been revoked'
      }, { status: 403 }); // 403 Forbidden
    }

    // Check if user already exists in this tenant
    const { data: existingUser, error: userError } = await supabase!
      .from('users')
      .select('id, email, name')
      .eq('tenant_id', invitation.tenant_id)
      .eq('email', invitation.email)
      .maybeSingle();

    if (userError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to validate invitation'
      }, { status: 500 });
    }

    if (existingUser) {
      // User already exists, mark invitation as accepted
      await supabase!
        .from('user_invitations')
        .update({ 
          status: 'accepted', 
          accepted_at: new Date().toISOString(),
          accepted_by: existingUser.id
        })
        .eq('id', invitation.id);

      return NextResponse.json({
        success: false,
        error: 'You are already a member of this organization',
                 data: {
           redirectUrl: `https://${(invitation.tenants as any).subdomain}.docsflow.app/dashboard`
         }
      }, { status: 409 });
    }

    // Check tenant user limits
    const { data: userLimitCheck, error: limitError } = await supabase!
      .rpc('check_user_limit', { tenant_uuid: invitation.tenant_id });

    if (limitError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to validate invitation'
      }, { status: 500 });
    }

    const { current_users, user_limit, can_add_user } = userLimitCheck[0];

    if (!can_add_user) {
      return NextResponse.json({
        success: false,
        error: `Organization has reached its user limit (${current_users}/${user_limit}). Please contact your administrator.`
      }, { status: 403 });
    }

    // Return invitation details for the frontend to display
    const accessLevelNames: Record<number, string> = {
      1: 'Public Access',
      2: 'Customer Access',
      3: 'Technician Access',
      4: 'Manager Access',
      5: 'Executive Access'
    };

    const roleNames: Record<string, string> = {
      admin: 'Administrator',
      user: 'User',
      viewer: 'Viewer'
    };

    return NextResponse.json({
      success: true,
      data: {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          roleName: roleNames[invitation.role] || invitation.role,
          accessLevel: invitation.access_level,
          accessLevelName: accessLevelNames[invitation.access_level] || 'Standard Access',
          expiresAt: invitation.expires_at,
          createdAt: invitation.created_at
        },
                 tenant: {
           id: (invitation.tenants as any).id,
           name: (invitation.tenants as any).name,
           subdomain: (invitation.tenants as any).subdomain,
           industry: (invitation.tenants as any).industry,
           logoUrl: (invitation.tenants as any).logo_url
         },
         inviter: invitation.invited_by ? {
           name: (invitation.invited_by as any).name,
           email: (invitation.invited_by as any).email
         } : null,
        userLimits: {
          current: current_users,
          limit: user_limit,
          remaining: user_limit - current_users
        }
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 