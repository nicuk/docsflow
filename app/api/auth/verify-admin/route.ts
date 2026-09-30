import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedMember, isTenantAdmin } from '@/lib/server-auth';

/**
 * Admin privilege verification API.
 *
 * Answers only for the signed-in caller. It used to answer for any
 * {email, tenantId} in the body and accepted any string as the bearer token,
 * so anyone could look up who the admins of a tenant are. A tenantId in the
 * body is still accepted, but only counts when it is the caller's own tenant.
 */

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await request.json().catch(() => ({}));

    const member = await getVerifiedMember();
    if (!member) {
      return NextResponse.json({
        success: false,
        isAdmin: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    if ((tenantId && tenantId !== member.tenantId) || !isTenantAdmin(member)) {
      return NextResponse.json({
        success: false,
        isAdmin: false,
        error: 'Admin privileges required'
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      isAdmin: true,
      accessLevel: member.accessLevel,
      role: member.role,
      userId: member.userId,
      verified: true
    });

  } catch (error) {
    console.error('Admin verification failed:', error);
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




