import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendInvitationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email, role, accessLevel, inviterName, tenantId } = await request.json();

    // Validate required fields
    if (!email || !role || !accessLevel || !inviterName || !tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: email, role, accessLevel, inviterName, tenantId'
      }, { status: 400 });
    }

    // Validate access level
    if (accessLevel < 1 || accessLevel > 5) {
      return NextResponse.json({
        success: false,
        error: 'Access level must be between 1 and 5'
      }, { status: 400 });
    }

    // Validate role
    if (!['admin', 'user', 'viewer'].includes(role)) {
      return NextResponse.json({
        success: false,
        error: 'Role must be admin, user, or viewer'
      }, { status: 400 });
    }

    // Check if tenant exists and get its info
    const { data: tenant, error: tenantError } = await supabase!
      .from('tenants')
      .select('id, name, subdomain, user_limit')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({
        success: false,
        error: 'Tenant not found'
      }, { status: 404 });
    }

    // Check tenant user limits
    const { data: userLimitCheck, error: limitError } = await supabase!
      .rpc('check_user_limit', { tenant_uuid: tenantId });

    if (limitError) {
      console.error('Error checking user limit:', limitError);
      return NextResponse.json({
        success: false,
        error: 'Failed to check user limits'
      }, { status: 500 });
    }

    const { current_users, user_limit, can_add_user } = userLimitCheck[0];

    if (!can_add_user) {
      return NextResponse.json({
        success: false,
        error: `User limit reached. Current: ${current_users}/${user_limit}. Please upgrade your plan.`
      }, { status: 403 });
    }

    // Check if user already exists in this tenant
    const { data: existingUser, error: userCheckError } = await supabase!
      .from('users')
      .select('id, email')
      .eq('tenant_id', tenantId)
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (userCheckError) {
      console.error('Error checking existing user:', userCheckError);
      return NextResponse.json({
        success: false,
        error: 'Failed to check existing users'
      }, { status: 500 });
    }

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'User with this email already exists in this organization'
      }, { status: 409 });
    }

    // Check if there's already a pending invitation for this email
    const { data: existingInvitation, error: invitationCheckError } = await supabase!
      .from('user_invitations')
      .select('id, status, expires_at')
      .eq('tenant_id', tenantId)
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .maybeSingle();

    if (invitationCheckError) {
      console.error('Error checking existing invitation:', invitationCheckError);
      return NextResponse.json({
        success: false,
        error: 'Failed to check existing invitations'
      }, { status: 500 });
    }

    if (existingInvitation) {
      // Check if invitation is still valid
      if (new Date(existingInvitation.expires_at) > new Date()) {
        return NextResponse.json({
          success: false,
          error: 'A pending invitation already exists for this email address'
        }, { status: 409 });
      } else {
        // Mark expired invitation as expired
        await supabase!
          .from('user_invitations')
          .update({ status: 'expired' })
          .eq('id', existingInvitation.id);
      }
    }

    // Generate secure token using database function
    const { data: tokenData, error: tokenError } = await supabase!
      .rpc('generate_invitation_token');

    if (tokenError || !tokenData) {
      console.error('Error generating token:', tokenError);
      return NextResponse.json({
        success: false,
        error: 'Failed to generate invitation token'
      }, { status: 500 });
    }

    const token = tokenData;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Get the inviter's user ID (in a real app, this would come from auth)
    const { data: inviter, error: inviterError } = await supabase!
      .from('users')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('name', inviterName)
      .maybeSingle();

    // Create invitation record
    const { data: invitation, error: invitationError } = await supabase!
      .from('user_invitations')
      .insert({
        tenant_id: tenantId,
        email: email.toLowerCase(),
        invited_by: inviter?.id || null,
        role,
        access_level: accessLevel,
        token,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select('id, token')
      .single();

    if (invitationError || !invitation) {
      console.error('Error creating invitation:', invitationError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create invitation'
      }, { status: 500 });
    }

    // Generate invitation URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${tenant.subdomain}.docsflow.app`;
    const invitationUrl = `${baseUrl}/invite/${invitation.token}`;

    // Send invitation email
    const emailResult = await sendInvitationEmail({
      inviteeEmail: email,
      inviterName,
      tenantName: tenant.name,
      invitationUrl,
      role,
      accessLevel
    });

    if (!emailResult.success) {
      // Log email error but don't fail the invitation creation
      console.error('Failed to send invitation email:', emailResult.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      data: {
        invitationId: invitation.id,
        invitationUrl,
        expiresAt: expiresAt.toISOString(),
        emailSent: emailResult.success,
        emailError: emailResult.error || null,
        userLimits: {
          current: current_users + 1, // Include the pending invitation
          limit: user_limit,
          remaining: user_limit - current_users - 1
        }
      }
    });

  } catch (error) {
    console.error('Error in invite API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// GET endpoint to list pending invitations for a tenant
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Missing tenantId parameter'
      }, { status: 400 });
    }

    // Get all pending invitations for the tenant
    const { data: invitations, error } = await supabase!
      .from('user_invitations')
      .select(`
        id,
        email,
        role,
        access_level,
        expires_at,
        status,
        created_at,
        invited_by:users(name, email)
      `)
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch invitations'
      }, { status: 500 });
    }

    // Clean up expired invitations
    await supabase!.rpc('cleanup_expired_invitations');

    return NextResponse.json({
      success: true,
      data: invitations || []
    });

  } catch (error) {
    console.error('Error in get invitations API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 