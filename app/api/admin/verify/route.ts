import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Admin verification API endpoint.
 * Used by admin components to verify admin privileges.
 */

export async function GET(request: NextRequest) {
  try {
    // Get tenant context from headers
    const tenantId = request.headers.get('x-tenant-id');
    const userEmail = request.headers.get('x-user-email');
    
    if (!tenantId || !userEmail) {
      return NextResponse.json({
        success: false,
        isAdmin: false,
        error: 'Missing tenant or user context'
      }, { status: 400 });
    }
    
    // Verify user exists and has admin privileges
    const { data: user, error } = await supabase!
      .from('users')
      .select('id, role, access_level, email')
      .eq('email', userEmail)
      .eq('tenant_id', tenantId)
      .single();
    
    if (error || !user) {
      return NextResponse.json({
        success: false,
        isAdmin: false,
        error: 'User not found'
      }, { status: 404 });
    }
    
    const isAdmin = user.role === 'admin' && user.access_level === 1;
    
    return NextResponse.json({
      success: true,
      isAdmin,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        accessLevel: user.access_level
      }
    });
    
  } catch (error) {
    console.error('Admin verification error:', error);
    return NextResponse.json({
      success: false,
      isAdmin: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-tenant-id, x-user-email',
    },
  });
}




