import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedMember, isTenantAdmin } from '@/lib/server-auth';

/**
 * Admin verification API endpoint.
 * Used by admin components to verify admin privileges.
 */

export async function GET(_request: NextRequest) {
  try {
    // Answers "is the signed-in caller an admin?" It used to answer that for
    // any email and tenant named in headers, which let anyone look up who the
    // admins of a tenant are.
    const member = await getVerifiedMember();
    if (!member) {
      return NextResponse.json({
        success: false,
        isAdmin: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      isAdmin: isTenantAdmin(member),
      user: {
        id: member.userId,
        email: member.email,
        role: member.role,
        accessLevel: member.accessLevel
      }
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




