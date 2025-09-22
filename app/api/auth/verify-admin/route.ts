import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * ISOLATED ADMIN VERIFICATION API
 * Surgical endpoint for admin privilege verification
 * Used by admin route protection middleware
 */

export async function POST(request: NextRequest) {
  try {
    const { email, tenantId } = await request.json();
    
    // Validate required parameters
    if (!email || !tenantId) {
      return NextResponse.json({
        success: false,
        isAdmin: false,
        error: 'Email and tenantId required'
      }, { status: 400 });
    }
    
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        isAdmin: false,
        error: 'Authorization token required'
      }, { status: 401 });
    }
    
    // Verify user exists and has admin privileges
    const { data: user, error } = await supabase!
      .from('users')
      .select('id, role, access_level, email, tenant_id')
      .eq('email', email)
      .eq('tenant_id', tenantId)
      .single();
    
    if (error || !user) {
      return NextResponse.json({
        success: false,
        isAdmin: false,
        error: 'User not found or access denied'
      }, { status: 403 });
    }
    
    // Check admin privileges
    const isAdmin = user.role === 'admin' && user.access_level === 1;
    
    if (!isAdmin) {
      return NextResponse.json({
        success: false,
        isAdmin: false,
        accessLevel: user.access_level,
        role: user.role,
        error: 'Admin privileges required'
      }, { status: 403 });
    }
    
    // Admin verification successful
    return NextResponse.json({
      success: true,
      isAdmin: true,
      accessLevel: user.access_level,
      role: user.role,
      userId: user.id,
      verified: true
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

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tenant-id, x-user-email',
    },
  });
}
