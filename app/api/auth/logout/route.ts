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
    if (tenantId) {
      await safeRedisOperation(async () => {
        await redis?.del(`tenant:${tenantId}`);
        await redis?.del(`user:${authToken}`);
        console.log('✅ Redis cache cleared');
      }, null);
    }
    
    // Step 3: Create response with cleared cookies
    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );
    
    // Clear all auth-related cookies with proper domain handling
    const isProduction = process.env.NODE_ENV === 'production';
    const domain = request.headers.get('host')?.includes('docsflow.app') 
      ? '.docsflow.app' 
      : undefined;
    
    // List of all cookies to clear
    const cookiesToClear = [
      'auth-token',
      'access_token',
      'refresh_token',
      'tenant-id',
      'tenant-subdomain',
      'user-email',
      'user_email'
    ];
    
    // Clear each cookie at multiple domain levels to ensure complete cleanup
    cookiesToClear.forEach(cookieName => {
      // Clear at current path
      response.cookies.set(cookieName, '', {
        path: '/',
        expires: new Date(0),
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax'
      });
      
      // If in production, also clear with domain specified
      if (domain) {
        response.headers.append(
          'Set-Cookie',
          `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${domain}; ${isProduction ? 'secure; ' : ''}httpOnly; sameSite=lax`
        );
      }
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
