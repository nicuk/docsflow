import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Admin users summary API endpoint.
 * Used by admin dashboard metrics.
 */

export async function GET(request: NextRequest) {
  try {
    // Get tenant context from headers
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    // Verify admin access
    const userId = request.headers.get('x-user-id') || 
                   request.nextUrl.searchParams.get('user_id');
                   
    if (userId) {
      const { data: userProfile } = await supabase!
        .from('users')
        .select('role, access_level')
        .eq('id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (!userProfile || userProfile.role !== 'admin' || userProfile.access_level !== 1) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }

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
      console.warn('Active users query failed:', activeError);
    }

    // Get admin count
    const { count: adminCount, error: adminError } = await supabase!
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('role', 'admin')
      .eq('access_level', 1);

    if (adminError) {
      console.warn('Admin count query failed:', adminError);
    }

    // Get pending invitations count
    const { count: pendingInvitations, error: pendingError } = await supabase!
      .from('user_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'pending');

    if (pendingError) {
      console.warn('Pending invitations query failed:', pendingError);
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
    console.error('Users summary error:', error);
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




