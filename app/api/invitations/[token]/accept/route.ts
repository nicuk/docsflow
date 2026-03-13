import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { name, confirmEmail } = await request.json();

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Invitation token is required'
      }, { status: 400 });
    }

    if (!name || !confirmEmail) {
      return NextResponse.json({
        success: false,
        error: 'Name and email confirmation are required'
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
        tenant_id,
        tenants!inner(
          id,
          name,
          subdomain,
          user_limit
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

    // Validate email confirmation
    if (confirmEmail.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json({
        success: false,
        error: 'Email confirmation does not match the invited email address'
      }, { status: 400 });
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: `Invitation is ${invitation.status}`
      }, { status: 409 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({
        success: false,
        error: 'This invitation has expired'
      }, { status: 410 });
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
        error: 'Failed to process invitation'
      }, { status: 500 });
    }

    if (existingUser) {
      // User already exists, just mark invitation as accepted
      await supabase!
        .from('user_invitations')
        .update({ 
          status: 'accepted', 
          accepted_at: new Date().toISOString(),
          accepted_by: existingUser.id
        })
        .eq('id', invitation.id);

      return NextResponse.json({
        success: true,
        message: 'You are already a member of this organization',
        data: {
          user: existingUser,
          tenant: invitation.tenants,
          redirectUrl: `https://${(invitation.tenants as any).subdomain}.docsflow.app/dashboard`
        }
      });
    }

    // Check tenant user limits
    const { data: userLimitCheck, error: limitError } = await supabase!
      .rpc('check_user_limit', { tenant_uuid: invitation.tenant_id });

    if (limitError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to process invitation'
      }, { status: 500 });
    }

    const { current_users, user_limit, can_add_user } = userLimitCheck[0];

    if (!can_add_user) {
      return NextResponse.json({
        success: false,
        error: `Organization has reached its user limit (${current_users}/${user_limit}). Please contact your administrator.`
      }, { status: 403 });
    }

    // Create new user
    const { data: newUser, error: createUserError } = await supabase!
      .from('users')
      .insert({
        tenant_id: invitation.tenant_id,
        email: invitation.email.toLowerCase(),
        name: name.trim(),
        role: invitation.role,
        access_level: invitation.access_level,
        last_login_at: new Date().toISOString()
      })
      .select('id, email, name, role, access_level')
      .single();

    if (createUserError || !newUser) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create user account'
      }, { status: 500 });
    }

    // Mark invitation as accepted
    const { error: updateInvitationError } = await supabase!
      .from('user_invitations')
      .update({ 
        status: 'accepted', 
        accepted_at: new Date().toISOString(),
        accepted_by: newUser.id
      })
      .eq('id', invitation.id);

    if (updateInvitationError) {
      // Non-critical: invitation update failed but user was created
      // Don't fail the request, user was created successfully
    }

    // Send welcome email
    const dashboardUrl = `https://${(invitation.tenants as any).subdomain}.docsflow.app/dashboard`;
    const emailResult = await sendWelcomeEmail({
      email: newUser.email,
      name: newUser.name,
      tenantName: (invitation.tenants as any).name,
      dashboardUrl
    });

    if (!emailResult.success) {
      // Non-critical: welcome email failed
      // Don't fail the request, just log the error
    }

    // Log analytics event
    await supabase!
      .from('analytics_events')
      .insert({
        tenant_id: invitation.tenant_id,
        event_type: 'user_invited_accepted',
        event_data: {
          user_id: newUser.id,
          invitation_id: invitation.id,
          role: invitation.role,
          access_level: invitation.access_level,
          email_sent: emailResult.success
        },
        user_id: newUser.id
      });

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully! Welcome to the team.',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          accessLevel: newUser.access_level
        },
        tenant: {
          id: (invitation.tenants as any).id,
          name: (invitation.tenants as any).name,
          subdomain: (invitation.tenants as any).subdomain
        },
        redirectUrl: dashboardUrl,
        welcomeEmailSent: emailResult.success,
        userLimits: {
          current: current_users + 1,
          limit: user_limit,
          remaining: user_limit - current_users - 1
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