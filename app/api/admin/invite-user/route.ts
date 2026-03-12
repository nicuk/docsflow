import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendInvitationEmail } from '@/lib/email';

/**
 * Admin invite user API endpoint.
 * Used by admin user management interface.
 */

export async function POST(request: NextRequest) {
  try {
    const { email, role, access_level } = await request.json();

    // Validate required fields
    if (!email || !role) {
      return NextResponse.json({
        success: false,
        error: 'Email and role are required'
      }, { status: 400 });
    }

    // Validate access level
    const accessLevel = access_level || (role === 'admin' ? 1 : 2);
    if (accessLevel < 1 || accessLevel > 2) {
      return NextResponse.json({
        success: false,
        error: 'Access level must be 1 or 2'
      }, { status: 400 });
    }

    // Validate role
    if (!['admin', 'user', 'viewer'].includes(role)) {
      return NextResponse.json({
        success: false,
        error: 'Role must be admin, user, or viewer'
      }, { status: 400 });
    }

    // Get tenant context from headers
    const tenantId = request.headers.get('x-tenant-id');
    const adminUserId = request.headers.get('x-user-id');

    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Tenant context required'
      }, { status: 400 });
    }

    // Verify admin access
    if (adminUserId) {
      const { data: adminUser } = await supabase!
        .from('users')
        .select('role, access_level')
        .eq('id', adminUserId)
        .eq('tenant_id', tenantId)
        .single();

      if (!adminUser || adminUser.role !== 'admin' || adminUser.access_level !== 1) {
        return NextResponse.json({
          success: false,
          error: 'Admin privileges required'
        }, { status: 403 });
      }
    }

    // Check if tenant exists and get info
    const { data: tenant, error: tenantError } = await supabase!
      .from('tenants')
      .select('id, name, subdomain')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({
        success: false,
        error: 'Tenant not found'
      }, { status: 404 });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase!
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('tenant_id', tenantId)
      .single();

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'User already exists in this tenant'
      }, { status: 409 });
    }

    // Check if invitation already exists
    const { data: existingInvitation } = await supabase!
      .from('user_invitations')
      .select('id, status')
      .eq('email', email)
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return NextResponse.json({
        success: false,
        error: 'Pending invitation already exists for this user'
      }, { status: 409 });
    }

    // Generate invitation token
    const invitationToken = Math.random().toString(36).substring(2, 15) + 
                           Math.random().toString(36).substring(2, 15);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase!
      .from('user_invitations')
      .insert({
        tenant_id: tenantId,
        email: email.toLowerCase(),
        role,
        access_level: accessLevel,
        token: invitationToken,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        invited_by: adminUserId
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Invitation creation error:', inviteError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create invitation'
      }, { status: 500 });
    }

    // Send invitation email
    try {
      const inviteUrl = `https://${tenant.subdomain}.docsflow.app/invite/${invitationToken}`;
      
      await sendInvitationEmail({
        inviteeEmail: email,
        inviterName: 'Admin', // Could get from admin user if needed
        tenantName: tenant.name,
        invitationUrl: inviteUrl,
        role: role,
        accessLevel: accessLevel
      });

      console.log(`✅ Invitation email sent to ${email}`);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'User invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        access_level: invitation.access_level,
        status: invitation.status,
        expires_at: invitation.expires_at
      }
    });

  } catch (error) {
    console.error('Invite user error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-tenant-id, x-user-id',
    },
  });
}
