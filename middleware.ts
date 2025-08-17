import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { 
  extractTenantFromHostname, 
  createSecureResponse,
  handlePreflight
} from './lib/security-middleware';
import { 
  checkRateLimit,
  detectSuspiciousActivity,
  getSecurityHeaders 
} from './lib/security-enhancements';
import { redis, safeRedisOperation } from './lib/redis';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for middleware
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// PERFORMANCE FIX: Use Redis for tenant verification with Supabase fallback
async function verifyTenantExists(subdomain: string): Promise<boolean> {
  try {
    // First try Redis cache (fast)
    const cachedTenant = await safeRedisOperation(
      () => redis!.get(`subdomain:${subdomain}`),
      null
    );
    
    if (cachedTenant) {
      console.log(`✅ Redis cache HIT for tenant: ${subdomain}`);
      return true;
    }
    
    // If not in Redis, check tenant cache
    const tenantCacheKey = `tenant:${subdomain}`;
    const tenantData = await safeRedisOperation(
      () => redis!.get(tenantCacheKey),
      null
    );
    
    if (tenantData) {
      console.log(`✅ Redis tenant cache HIT for: ${subdomain}`);
      return true;
    }
    
    // CRITICAL: Also check Supabase database if Redis misses
    // This is essential for tenants created through the database
    console.log(`🔍 Redis cache MISS for tenant: ${subdomain}, checking Supabase...`);
    
    if (supabase) {
      try {
        const { data: tenant, error } = await supabase
          .from('tenants')
          .select('id, subdomain, name')
          .eq('subdomain', subdomain)
          .maybeSingle();
        
        if (error) {
          console.error(`❌ Supabase query error for ${subdomain}:`, error);
        } else if (tenant) {
          console.log(`✅ Tenant found in Supabase: ${subdomain} (ID: ${tenant.id})`);
          // Cache it in Redis for next time
          await safeRedisOperation(
            () => redis!.set(tenantCacheKey, JSON.stringify({ 
              id: tenant.id,
              subdomain: tenant.subdomain,
              name: tenant.name,
              exists: true 
            }), { ex: 3600 }),
            null
          );
          return true;
        } else {
          console.log(`❌ Tenant ${subdomain} not found in Supabase`);
        }
      } catch (dbError) {
        console.error('Supabase tenant check error:', dbError);
      }
    } else {
      console.warn('⚠️ Supabase client not initialized in middleware');
    }
    
    console.log(`❌ Tenant not found anywhere: ${subdomain}`);
    return false;
  } catch (error) {
    console.error('Tenant verification error:', error);
    return false;
  }
}

export default async function middleware(request: NextRequest) {
  try {
    const { pathname, hostname } = request.nextUrl;
    const origin = request.headers.get('origin');
    
    // Handle OPTIONS preflight requests
    if (request.method === 'OPTIONS') {
      return handlePreflight(request);
    }
    
    // Enhanced security checks
    if (detectSuspiciousActivity(request)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Rate limiting check
    if (!checkRateLimit(request, 200)) {
      return new NextResponse('Rate limit exceeded', { status: 429 });
    }
    
    // Skip middleware for static files and assets
    if (pathname.startsWith('/_next') || 
        pathname.startsWith('/favicon.ico') ||
        pathname.startsWith('/sitemap.xml') ||
        pathname.startsWith('/robots.txt')) {
      return NextResponse.next();
    }



    // DOMAIN NORMALIZATION: www redirect now handled by vercel.json

    // REGIONAL PATHS: Redirect /my or /uk to root
    if ((hostname === 'docsflow.app' || hostname === 'api.docsflow.app' || hostname === 'localhost') &&
        (pathname === '/my' || pathname.startsWith('/my/') || pathname === '/uk' || pathname.startsWith('/uk/'))) {
      const root = new URL('https://docsflow.app/');
      return NextResponse.redirect(root, 301);
    }

    // CRITICAL: Handle API subdomain separately - it's NOT a tenant
    if (hostname === 'api.docsflow.app' || hostname === 'api.localhost') {
      // API subdomain should pass through without tenant context
      const response = NextResponse.next();
      // Explicitly DO NOT set any tenant headers for API subdomain
      console.log('API subdomain detected - bypassing tenant validation');
      return createSecureResponse(response, origin);
    }

    // Extract tenant from hostname
    const tenant = extractTenantFromHostname(hostname);

    // Route tenant subdomains to the tenant-specific dashboard
    if (tenant) {
      // CRITICAL: Allow API routes to pass through even if tenant doesn't exist yet
      // This is essential for subdomain availability checks during onboarding
      if (pathname.startsWith('/api')) {
        const response = NextResponse.next();
        // Only set x-tenant-subdomain, not x-tenant-id (which needs UUID)
        // The actual tenant UUID will be resolved by the API routes
        response.headers.set('x-tenant-subdomain', tenant);
        return createSecureResponse(response, origin);
      }
      
      // For non-API routes, verify tenant exists before allowing subdomain access
      const tenantExists = await verifyTenantExists(tenant);
      
      if (!tenantExists) {
        // Tenant doesn't exist - redirect to main domain for onboarding
        const mainDomainUrl = new URL('https://docsflow.app/onboarding');
        return NextResponse.redirect(mainDomainUrl);
      }

      // CRITICAL FIX: Check if stored tenant-id cookie matches current subdomain
      const storedTenantId = request.cookies.get('tenant-id')?.value;
      const userEmail = request.cookies.get('user_email')?.value;
      const authToken = request.cookies.get('access_token')?.value;
      
      // If user has a different tenant stored, clear it for proper isolation
      if (storedTenantId && storedTenantId !== tenant) {
        console.log(`⚠️ Tenant mismatch detected! Stored: ${storedTenantId}, Current: ${tenant}`);
        // User is trying to access a different tenant - need to re-authenticate
        const response = NextResponse.rewrite(new URL(`/login`, request.url));
        response.headers.set('x-tenant-id', tenant);
        response.headers.set('x-tenant-subdomain', tenant);
        // Clear the mismatched tenant cookie
        response.cookies.delete('tenant-id');
        response.cookies.delete('access_token');
        response.cookies.delete('refresh_token');
        response.cookies.delete('user_email');
        console.log(`🔄 Cleared cookies for tenant switch from ${storedTenantId} to ${tenant}`);
        return createSecureResponse(response, origin);
      }

      // If root path, check if user is authenticated
      if (pathname === '/' || pathname === '') {
        if (userEmail && authToken && storedTenantId === tenant) {
          // User is authenticated AND on the correct tenant - show dashboard
          const response = NextResponse.rewrite(new URL(`/dashboard`, request.url));
          response.headers.set('x-tenant-id', tenant);
          response.headers.set('x-tenant-subdomain', tenant);
          return createSecureResponse(response, origin);
        } else {
          // User is NOT authenticated or tenant mismatch - redirect to LOGIN for this tenant
          // CRITICAL: Don't send to onboarding for existing tenants!
          const response = NextResponse.rewrite(new URL(`/login`, request.url));
          response.headers.set('x-tenant-id', tenant);
          response.headers.set('x-tenant-subdomain', tenant);
          return createSecureResponse(response, origin);
        }
      }
      // Otherwise, preserve the path structure for tenant routes
      // Map tenant paths to actual app routes
      let targetPath = pathname;
      if (pathname.startsWith('/dashboard')) {
        targetPath = pathname; // Keep dashboard paths as-is
      } else if (pathname === '/') {
        targetPath = '/dashboard'; // Root goes to dashboard
      }
      const response = NextResponse.rewrite(new URL(targetPath, request.url));

      // 🚨 Inject the tenant ID and subdomain into the request headers for frontend context
      response.headers.set('x-tenant-id', tenant);
      response.headers.set('x-tenant-subdomain', tenant);

      return createSecureResponse(response, origin);
    }

    // Handle root domain (docsflow.app) access
    if (hostname === 'docsflow.app' || hostname === 'localhost') {
      // ESCAPE HATCH: Check for logout query parameter FIRST
      const { searchParams } = new URL(request.url);
      const isLoggedOut = searchParams.get('logged_out');
      
      if (isLoggedOut) {
        console.log('🚪 LOGOUT ESCAPE HATCH ACTIVATED - Clearing all cookies');
        const response = NextResponse.next();
        
        // Nuclear cookie clearing
        const cookiesToClear = [
          'tenant-id', 'tenant-subdomain', 'access_token', 'refresh_token',
          'user_email', 'user-email', 'auth-token', 'sb-access-token', 'sb-refresh-token'
        ];
        
        cookiesToClear.forEach(cookie => {
          response.cookies.delete(cookie);
          response.headers.append('Set-Cookie', `${cookie}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`);
          response.headers.append('Set-Cookie', `${cookie}=; path=/; domain=.docsflow.app; expires=Thu, 01 Jan 1970 00:00:00 GMT`);
        });
        
        return createSecureResponse(response, origin);
      }
      
      // Check if user has tenant cookies
      const tenantId = request.cookies.get('tenant-id')?.value;
      const tenantSubdomain = request.cookies.get('tenant-subdomain')?.value;
      const authToken = request.cookies.get('access_token')?.value;
      
      // CRITICAL: Don't redirect to tenant if user is explicitly on login/register pages
      // This allows users to stay on main domain after logout
      if ((pathname === '/login' || pathname === '/register') && (tenantId || tenantSubdomain)) {
        console.log('⚠️ User on login/register with stale tenant cookies, allowing main domain access');
        const response = NextResponse.next();
        // Don't forcibly clear cookies here - let the login process handle it
        return createSecureResponse(response, origin);
      }
      
      // ONLY clear cookies on explicit logout path to prevent redirect loops
      if (pathname === '/logout') {
        console.log('🔄 Logout requested, clearing all cookies');
        const response = NextResponse.redirect(new URL('/login', request.url));
        
        // Clear all auth and tenant cookies at multiple domain levels
        const cookiesToClear = [
          'tenant-id', 'tenant-subdomain', 'access_token', 'refresh_token', 
          'user_email', 'user-email', 'auth-token', 'sb-access-token', 'sb-refresh-token'
        ];
        
        cookiesToClear.forEach(cookie => {
          response.cookies.delete(cookie);
          response.headers.append('Set-Cookie', `${cookie}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`);
          response.headers.append('Set-Cookie', `${cookie}=; path=/; domain=.docsflow.app; expires=Thu, 01 Jan 1970 00:00:00 GMT`);
          response.headers.append('Set-Cookie', `${cookie}=; path=/; domain=docsflow.app; expires=Thu, 01 Jan 1970 00:00:00 GMT`);
        });
        
        return createSecureResponse(response, origin);
      }
      
      // REMOVED: The redirect to tenant subdomain was causing infinite loops
      // Let the frontend handle routing based on user state instead
      
      // Allow these routes on root domain without any cookie manipulation
      if (pathname.startsWith('/onboarding') || 
          pathname.startsWith('/api') || 
          pathname.startsWith('/login') ||
          pathname.startsWith('/register') ||
          pathname === '/') {
        // Continue to the backend route handler
        const response = NextResponse.next();
        return createSecureResponse(response, origin);
      }
    }

    // Handle backend domain access - redirect to main domain for non-API routes
    if (hostname.includes('ai-lead-router-saas') && hostname.includes('vercel.app') && !hostname.includes('docsflow.app')) {
      // Allow API routes and onboarding on backend domain
      if (pathname.startsWith('/api') || pathname.startsWith('/onboarding') || pathname.startsWith('/app/')) {
        const response = NextResponse.next();
        return createSecureResponse(response, origin);
      }
      
      // Only redirect if we're NOT already on docsflow.app domain
      return NextResponse.redirect(new URL(`https://docsflow.app${pathname}`, request.url), 301);
    }

    // Default - allow frontend to handle

    const response = NextResponse.next();
    return createSecureResponse(response, origin);
    
  } catch (error) {
    console.error('Middleware error:', error);
    const response = NextResponse.next();
    return createSecureResponse(response, request.headers.get('origin'));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Note: We DO want to process /api routes for CORS headers
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 