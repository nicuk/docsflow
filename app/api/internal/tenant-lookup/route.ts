/**
 * Internal API for secure tenant lookup
 * Replaces middleware direct service role usage
 * BACKEND ONLY - Not exposed to frontend
 */

import { NextRequest, NextResponse } from 'next/server';
import { SecureTenantService } from '@/lib/secure-database';

// Rate limiting for internal API
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkInternalRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 200; // Higher limit for internal API
  
  const current = requestCounts.get(ip);
  if (!current || now > current.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (!checkInternalRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const { searchParams } = request.nextUrl;
    const subdomain = searchParams.get('subdomain');
    const tenantId = searchParams.get('tenantId');

    if (!subdomain && !tenantId) {
      return NextResponse.json(
        { error: 'subdomain or tenantId parameter required' },
        { status: 400 }
      );
    }

    let tenant;
    if (subdomain) {
      tenant = await SecureTenantService.getTenantBySubdomain(subdomain);
    } else if (tenantId) {
      tenant = await SecureTenantService.getTenantByUUID(tenantId);
    }

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        subdomain: tenant.subdomain,
        name: tenant.name,
        industry: tenant.industry
      }
    });

  } catch (error) {
    console.error('Internal tenant lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Verify endpoint availability
export async function POST(request: NextRequest) {
  try {
    const { subdomain } = await request.json();
    
    if (!subdomain) {
      return NextResponse.json(
        { error: 'subdomain required' },
        { status: 400 }
      );
    }

    const exists = await SecureTenantService.verifyTenantExists(subdomain);
    
    return NextResponse.json({
      success: true,
      exists,
      subdomain
    });

  } catch (error) {
    console.error('Tenant verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
