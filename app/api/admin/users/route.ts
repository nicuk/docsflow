import { NextRequest, NextResponse } from 'next/server';
import { requireMember } from '@/lib/server-auth';
import { supabase } from '@/lib/supabase';

/**
 * Admin users API endpoint.
 * Used by admin dashboard for user management.
 */

export async function GET(request: NextRequest) {
  try {
    // Signed-in admin of their own tenant. Tenant and user used to come from
    // x-tenant-id / x-user-id headers, which the browser controls.
    const check = await requireMember({ admin: true });
    if (check instanceof NextResponse) return check;
    const tenantId = check.tenantId;
    const userId = check.userId;


    // Get all users for the tenant
    const { data: users, error: usersError } = await supabase!
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        access_level,
        last_login_at,
        created_at
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (usersError) {
      throw usersError;
    }

    // Get pending invitations
    const { data: invitations, error: invitationsError } = await supabase!
      .from('user_invitations')
      .select(`
        id,
        email,
        role,
        access_level,
        status,
        created_at,
        expires_at
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (invitationsError) {
      // Non-critical: invitations query failed
    }

    return NextResponse.json({
      success: true,
      data: {
        users: users || [],
        invitations: invitations || []
      }
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-tenant-id, x-user-id',
    },
  });
}




