import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Admin route protection.
 * Controls access to admin dashboard routes.
 */

interface AdminVerificationResult {
  isAdmin: boolean;
  shouldRedirect: boolean;
  redirectUrl?: string;
  error?: string;
}

/**
 * Checks if a route requires admin privileges
 */
export function isAdminRoute(pathname: string): boolean {
  const adminRoutes = [
    '/dashboard/admin',
    '/api/admin'
  ];
  
  return adminRoutes.some(route => pathname.startsWith(route));
}

/**
 * Extracts user email from JWT token safely
 */
function extractEmailFromJWT(authToken: string): string | null {
  try {
    if (!authToken || typeof authToken !== 'string') return null;
    
    const parts = authToken.split('.');
    if (parts.length !== 3) return null;
    
    if (!authToken.startsWith('eyJ')) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    const email = payload?.email;
    
    if (email && typeof email === 'string' && email.includes('@')) {
      return email;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Verifies admin access using secure database lookup
 * Isolated from main middleware to avoid interference
 */
export async function verifyAdminAccess(request: NextRequest): Promise<AdminVerificationResult> {
  try {
    const hostname = request.headers.get('host') || '';
    const pathname = request.nextUrl.pathname;
    
    // Extract tenant from hostname
    const parts = hostname.split('.');
    const tenant = parts.length > 2 ? parts[0] : null;
    
    if (!tenant || tenant === 'www' || tenant === 'docsflow') {
      return {
        isAdmin: false,
        shouldRedirect: true,
        redirectUrl: 'https://docsflow.app/login',
        error: 'No tenant context for admin route'
      };
    }
    
    // Get authentication token from cookies
    const cookies = request.cookies;
    let authToken: string | null = null;
    
    // Try multiple cookie sources
    authToken = cookies.get('docsflow_auth_token')?.value ||
                cookies.get('access_token')?.value ||
                null;
    
    // If no direct token, check Supabase session cookies
    if (!authToken) {
      const allCookies = cookies.getAll();
      const supabaseCookie = allCookies.find(c => 
        c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
      );
      
      if (supabaseCookie?.value) {
        try {
          // Parse Supabase session cookie
          const sessionData = JSON.parse(supabaseCookie.value);
          authToken = sessionData?.access_token || null;
        } catch (e) {
          // Silent fail
        }
      }
    }
    
    if (!authToken) {
      return {
        isAdmin: false,
        shouldRedirect: true,
        redirectUrl: `https://${tenant}.docsflow.app/login`,
        error: 'No authentication token'
      };
    }
    
    // Extract user email from token
    const userEmail = extractEmailFromJWT(authToken);
    if (!userEmail) {
      return {
        isAdmin: false,
        shouldRedirect: true,
        redirectUrl: `https://${tenant}.docsflow.app/login`,
        error: 'Invalid authentication token'
      };
    }
    
    // Get tenant ID from headers (set by main middleware)
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return {
        isAdmin: false,
        shouldRedirect: true,
        redirectUrl: `https://${tenant}.docsflow.app/dashboard`,
        error: 'No tenant context'
      };
    }
    
    // Verify admin status using secure API call
    try {
      const verifyUrl = new URL('/api/auth/verify-admin', `https://${tenant}.docsflow.app`);
      const verifyResponse = await fetch(verifyUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'x-tenant-id': tenantId,
          'x-user-email': userEmail
        },
        body: JSON.stringify({
          email: userEmail,
          tenantId: tenantId
        })
      });
      
      if (verifyResponse.ok) {
        const result = await verifyResponse.json();
        if (result.isAdmin && result.accessLevel === 1) {
          return {
            isAdmin: true,
            shouldRedirect: false
          };
        }
      }
      
      // Fallback: Direct database check if API fails
      return await fallbackAdminCheck(userEmail, tenantId);
      
    } catch (apiError) {
      console.warn('Admin verification API failed, using fallback:', apiError);
      return await fallbackAdminCheck(userEmail, tenantId);
    }
    
  } catch (error) {
    console.error('Admin verification error:', error);
    return {
      isAdmin: false,
      shouldRedirect: true,
      redirectUrl: '/dashboard',
      error: 'Verification failed'
    };
  }
}

/**
 * Fallback admin check using direct database access
 * Only used if API verification fails
 */
async function fallbackAdminCheck(userEmail: string, tenantId: string): Promise<AdminVerificationResult> {
  try {
    // Only use service role for admin verification as fallback
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceKey) {
      return {
        isAdmin: false,
        shouldRedirect: true,
        redirectUrl: '/dashboard',
        error: 'Service configuration missing'
      };
    }
    
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false }
    });
    
    const { data: user, error } = await supabase
      .from('users')
      .select('role, access_level')
      .eq('email', userEmail)
      .eq('tenant_id', tenantId)
      .single();
    
    if (error || !user) {
      return {
        isAdmin: false,
        shouldRedirect: true,
        redirectUrl: '/dashboard',
        error: 'User not found'
      };
    }
    
    const isAdmin = user.role === 'admin' && user.access_level === 1;
    
    return {
      isAdmin,
      shouldRedirect: !isAdmin,
      redirectUrl: isAdmin ? undefined : '/dashboard',
      error: isAdmin ? undefined : 'Insufficient privileges'
    };
    
  } catch (error) {
    console.error('Fallback admin check error:', error);
    return {
      isAdmin: false,
      shouldRedirect: true,
      redirectUrl: '/dashboard',
      error: 'Database check failed'
    };
  }
}

/**
 * Creates admin protection response
 * Handles redirects and access denial
 */
export function createAdminProtectionResponse(
  request: NextRequest, 
  verification: AdminVerificationResult
): NextResponse {
  if (verification.shouldRedirect && verification.redirectUrl) {
    const redirectUrl = verification.redirectUrl.startsWith('http') 
      ? verification.redirectUrl 
      : new URL(verification.redirectUrl, request.url).toString();
      
    console.log(`🔐 [ADMIN-PROTECTION] Redirecting non-admin user: ${redirectUrl}`);
    return NextResponse.redirect(new URL(redirectUrl));
  }
  
  if (!verification.isAdmin) {
    console.log(`❌ [ADMIN-PROTECTION] Access denied: ${verification.error}`);
    return new NextResponse('Access Denied: Admin privileges required', { 
      status: 403,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }
  
  // Admin access granted - continue with request
  const response = NextResponse.next();
  response.headers.set('x-admin-verified', 'true');
  console.log(`✅ [ADMIN-PROTECTION] Admin access granted`);
  return response;
}




