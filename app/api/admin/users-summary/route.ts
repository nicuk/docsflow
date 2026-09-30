import { NextRequest, NextResponse } from 'next/server';
import { requireMember } from '@/lib/server-auth';
import { supabase } from '@/lib/supabase';

/**
 * Admin users summary API endpoint.
 * Used by admin dashboard metrics.
 */

export async function GET(request: NextRequest) {
  try {
    // Signed-in admin of their own tenant. Tenant and user used to come from
    // x-tenant-id / x-user-id headers, which the browser controls.
    const check = await requireMember({ admin: true });
    if (check instanceof NextResponse) return check;
    const tenantId = check.tenantId;
    const userId = check.userId;


    // Get total users count
    const { count: totalUsers, error: totalError } = await supabase!
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (totalError) {
      throw totalError;
    }

    // Get active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: activeUsers, error: activeError } = await supabase!
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('last_login_at', thirtyDaysAgo.toISOString());

    if (activeError) {
      // Non-critical: active users query failed
    }

    // Get admin count
    const { count: adminCount, error: adminError } = await supabase!
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('role', 'admin')
      .eq('access_level', 1);

    if (adminError) {
      // Non-critical: admin count query failed
    }

    // Get pending invitations count
    const { count: pendingInvitations, error: pendingError } = await supabase!
      .from('user_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'pending');

    if (pendingError) {
      // Non-critical: pending invitations query failed
    }

    const summary = {
      total: totalUsers || 0,
      active: activeUsers || 0,
      pending: pendingInvitations || 0,
      adminCount: adminCount || 0
    };

    return NextResponse.json({
      success: true,
      data: summary
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to fetch users summary',
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




