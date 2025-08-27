import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { redis, safeRedisOperation } from '@/lib/redis';
import { cookies } from 'next/headers';

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value || cookieStore.get('access_token')?.value;
    const tenantId = cookieStore.get('tenant-id')?.value;
    const tenantSubdomain = cookieStore.get('tenant-subdomain')?.value;
    
    console.log('🚪 Processing logout request...');
    console.log('Current host:', request.headers.get('host'));
    console.log('Tenant context:', { tenantId, tenantSubdomain });
    
    // Step 1: Revoke Supabase session if token exists
    if (authToken) {
      try {
        const { error } = await supabaseAdmin.auth.admin.signOut(authToken);
        if (error) {
          console.warn('⚠️ Supabase logout warning:', error.message);
        } else {
          console.log('✅ Supabase session revoked');
        }
      } catch (error) {
        console.warn('⚠️ Supabase logout failed:', error);
      }
    }
    
    // Step 2: Clear Redis cache entries
    if (tenantId || tenantSubdomain) {
      await safeRedisOperation(async () => {
        if (tenantId) await redis?.del(`tenant:${tenantId}`);
        if (tenantSubdomain) await redis?.del(`subdomain:${tenantSubdomain}`);
        if (authToken) await redis?.del(`user:${authToken}`);
        console.log('✅ Redis cache cleared');
      }, null);
    }
    
    // Step 3: Create response that redirects to main domain
    // CRITICAL: Redirect to main domain to escape subdomain context
    const isOnSubdomain = request.headers.get('host')?.includes('.docsflow.app') &&
                         !request.headers.get('host')?.startsWith('api.') &&
                         !request.headers.get('host')?.startsWith('www.');
    
    // SURGICAL FIX: Always redirect to main domain to escape subdomain context
    const redirectUrl = isOnSubdomain 
      ? `https://docsflow.app/login?logged_out=${Date.now()}` 
      : `https://docsflow.app/login?logged_out=${Date.now()}`;
    
    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully', redirectUrl },
      { status: 200 }
    );
    
    // Clear all auth-related cookies with proper domain handling
    const isProduction = process.env.NODE_ENV === 'production';
    
    // List of all cookies to clear
    const cookiesToClear = [
      'auth-token',
      'access_token', 
      'refresh_token',
      'tenant-id',
      'tenant-subdomain',
      'user-email',
      'user_email',
      'sb-access-token',
      'sb-refresh-token'
    ];
    
    // Clear each cookie at ALL domain levels to ensure complete cleanup
    cookiesToClear.forEach(cookieName => {
      // 1. Clear without domain (for current exact domain)
      response.cookies.set(cookieName, '', {
        path: '/',
        expires: new Date(0),
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax'
      });
      
      // 2. Clear with .docsflow.app domain (for cross-subdomain)
      response.headers.append(
        'Set-Cookie',
        `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=.docsflow.app; ${isProduction ? 'secure; ' : ''}httpOnly; sameSite=lax`
      );
      
      // 3. Clear with specific subdomain if on subdomain
      const host = request.headers.get('host');
      if (host && host.includes('.docsflow.app')) {
        const subdomain = host.split('.')[0];
        if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
          response.headers.append(
            'Set-Cookie',
            `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${subdomain}.docsflow.app; ${isProduction ? 'secure; ' : ''}httpOnly; sameSite=lax`
          );
        }
      }
      
      // 4. Clear with no domain but different sameSite values
      response.headers.append(
        'Set-Cookie',
        `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; ${isProduction ? 'secure; ' : ''}sameSite=none`
      );
    });
    
    console.log('✅ Logout completed successfully');
    
    return response;
    
  } catch (error) {
    console.error('❌ Logout error:', error);
    
    // Even if logout fails, still clear cookies
    const response = NextResponse.json(
      { success: false, error: 'Logout failed but cookies cleared' },
      { status: 500 }
    );
    
    // Force clear cookies anyway
    const cookiesToClear = ['auth-token', 'access_token', 'refresh_token', 'tenant-id', 'tenant-subdomain', 'user-email', 'user_email'];
    cookiesToClear.forEach(cookieName => {
      response.cookies.set(cookieName, '', { path: '/', expires: new Date(0) });
    });
    
    return response;
  }
}
