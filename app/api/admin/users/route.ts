import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Admin users API endpoint.
 * Used by admin dashboard for user management.
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




