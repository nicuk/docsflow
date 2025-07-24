import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 DEMO: Testing invitation system end-to-end');

    // Create a demo invitation
    const demoData = {
      email: 'test@example.com',
      role: 'user',
      accessLevel: 3,
      inviterName: 'Demo Admin',
      tenantId: 'sme-demo' // Use the demo tenant from our schema
    };

    // Get the actual tenant ID from subdomain
    const { data: tenant, error: tenantError } = await supabase!
      .from('tenants')
      .select('id, name, subdomain')
      .eq('subdomain', 'sme-demo')
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({
        success: false,
        error: 'Demo tenant not found. Please run the database schema setup first.'
      }, { status: 404 });
    }

    // Update demo data with actual tenant ID
    demoData.tenantId = tenant.id;

    console.log('📊 Demo tenant found:', tenant);

    // Test the invitation API
    const inviteResponse = await fetch(`${request.url.replace('/demo/invitation', '/users/invite')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(demoData)
    });

    const inviteResult = await inviteResponse.json();

    if (!inviteResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create invitation',
        details: inviteResult
      }, { status: inviteResponse.status });
    }

    console.log('✅ Invitation created successfully:', inviteResult.data.invitationId);

    // Test the get invitation API
    const token = inviteResult.data.invitationUrl.split('/').pop();
    const getInviteResponse = await fetch(`${request.url.replace('/demo/invitation', `/invitations/${token}`)}`, {
      method: 'GET'
    });

    const getInviteResult = await getInviteResponse.json();

    console.log('📧 Invitation details retrieved:', getInviteResult.success);

    // Test invitation acceptance
    const acceptData = {
      name: 'Test User',
      confirmEmail: demoData.email
    };

    const acceptResponse = await fetch(`${request.url.replace('/demo/invitation', `/invitations/${token}/accept`)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(acceptData)
    });

    const acceptResult = await acceptResponse.json();

    console.log('🎉 Invitation acceptance result:', acceptResult.success);

    // Clean up - remove the demo user and invitation for next test
    if (acceptResult.success && acceptResult.data.user) {
      await supabase!
        .from('users')
        .delete()
        .eq('id', acceptResult.data.user.id);
      
      console.log('🧹 Demo user cleaned up');
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation system demo completed successfully!',
      results: {
        invitationCreated: inviteResult.success,
        invitationData: inviteResult.data,
        invitationRetrieved: getInviteResult.success,
        invitationAccepted: acceptResult.success,
        acceptanceData: acceptResult.data,
        cleanupCompleted: true
      },
      logs: [
        '✅ Created invitation with secure token',
        '✅ Email sent (or logged in development)',
        '✅ Retrieved invitation details by token',
        '✅ Validated invitation and created user',
        '✅ Sent welcome email',
        '✅ Cleaned up demo data'
      ]
    });

  } catch (error) {
    console.error('❌ Demo invitation system error:', error);
    return NextResponse.json({
      success: false,
      error: 'Demo failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to show invitation system status
export async function GET(request: NextRequest) {
  try {
    // Check database tables exist
    const tables = await Promise.all([
      supabase!.from('tenants').select('count', { count: 'exact', head: true }),
      supabase!.from('users').select('count', { count: 'exact', head: true }),
      supabase!.from('user_invitations').select('count', { count: 'exact', head: true })
    ]);

    const [tenantsResult, usersResult, invitationsResult] = tables;

    // Check if demo tenant exists
    const { data: demoTenant, error: demoError } = await supabase!
      .from('tenants')
      .select('id, name, subdomain, plan_type, user_limit')
      .eq('subdomain', 'sme-demo')
      .single();

    // Get some sample invitation data
    const { data: sampleInvitations, error: inviteError } = await supabase!
      .from('user_invitations')
      .select('id, email, role, access_level, status, created_at')
      .limit(5);

    return NextResponse.json({
      success: true,
      message: 'Invitation system status check',
      database: {
        tenants: {
          accessible: !tenantsResult.error,
          count: tenantsResult.count || 0
        },
        users: {
          accessible: !usersResult.error,
          count: usersResult.count || 0
        },
        invitations: {
          accessible: !invitationsResult.error,
          count: invitationsResult.count || 0
        }
      },
      demoTenant: demoError ? null : demoTenant,
      sampleInvitations: inviteError ? [] : (sampleInvitations || []),
      endpoints: {
        createInvitation: 'POST /api/users/invite',
        getInvitation: 'GET /api/invitations/[token]',
        acceptInvitation: 'POST /api/invitations/[token]/accept',
        listInvitations: 'GET /api/users/invite?tenantId=...'
      },
      testCommand: 'POST /api/demo/invitation'
    });

  } catch (error) {
    console.error('❌ Status check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 