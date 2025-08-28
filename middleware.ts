import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { TenantContextManager } from './lib/tenant-context-manager';
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
    const { pathname } = request.nextUrl;
    const hostname = request.headers.get('host') || '';
    const origin = request.headers.get('origin');
    
    // Skip middleware for static files and assets FIRST (before any logging)
    if (pathname.startsWith('/_next') || 
        pathname.startsWith('/favicon.ico') ||
        pathname.startsWith('/favicon.svg') ||
        pathname.startsWith('/logo.svg') ||
        pathname.startsWith('/docsflow-brand-primary-horizontal-md.svg') ||
        pathname.startsWith('/apple-touch-icon.png') ||
        pathname.startsWith('/sitemap.xml') ||
        pathname.startsWith('/robots.txt')) {
      return NextResponse.next();
    }
    
    console.log(`🔍 [MIDDLEWARE START] ${request.method} ${hostname}${pathname}`);
    console.log(`🔍 [MIDDLEWARE] HOSTNAME DEBUG: '${hostname}' (length: ${hostname.length})`);
    console.log(`🔍 [MIDDLEWARE] User-Agent: ${request.headers.get('user-agent')?.substring(0, 50)}...`);
    console.log(`🔍 [MIDDLEWARE] Origin: ${origin}`);
    console.log(`🔍 [MIDDLEWARE] Request URL: ${request.url}`);
    
    // FETCH FAILED DEBUGGING: Log all request headers for network debugging
    if (pathname === '/login') {
      console.log(`🔍 [LOGIN REQUEST DEBUG] Headers:`, Object.fromEntries(request.headers.entries()));
    }
    
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



    // DOMAIN NORMALIZATION: www redirect now handled by vercel.json

    // REGIONAL PATHS: Redirect /my or /uk to root ONLY if not already at root
    if ((hostname === 'docsflow.app' || hostname === 'api.docsflow.app' || hostname === 'localhost') &&
        (pathname === '/my' || pathname.startsWith('/my/') || pathname === '/uk' || pathname.startsWith('/uk/'))) {
      // FIX: Use relative redirect to avoid infinite loops
      return NextResponse.redirect(new URL('/', request.url), 301);
    }

    // CRITICAL: Handle API subdomain separately - it's NOT a tenant
    if (hostname === 'api.docsflow.app' || hostname === 'api.localhost') {
      // API subdomain should pass through without tenant context
      const response = NextResponse.next();
      // Explicitly DO NOT set any tenant headers for API subdomain
      console.log('🔍 [MIDDLEWARE] API subdomain detected - bypassing tenant validation');
      return createSecureResponse(response, origin);
    }

    // CRITICAL FIX: Accept www.docsflow.app as canonical main domain
    // Do NOT redirect www to avoid infinite loops with DNS/Vercel configuration
    // www is handled same as main domain (no tenant context)

    // Extract tenant from hostname (returns null for www and main domain)
    const tenant = extractTenantFromHostname(hostname);
    console.log(`🔍 [MIDDLEWARE] Extracted tenant: '${tenant}' from hostname: '${hostname}'`);

    // Route tenant subdomains to the tenant-specific dashboard
    if (tenant) {
      console.log(`🔍 [MIDDLEWARE] Processing tenant subdomain: ${tenant}`);
      // CRITICAL: Allow API routes to pass through even if tenant doesn't exist yet
      // This is essential for subdomain availability checks during onboarding
      if (pathname.startsWith('/api')) {
        const response = NextResponse.next();
        
        // SURGICAL FIX: Special handling for logout - clear tenant headers
        if (pathname === '/api/auth/logout') {
          response.headers.delete('x-tenant-id');
          response.headers.delete('x-tenant-subdomain');
          console.log('🚪 Logout request - clearing tenant context');
          return createSecureResponse(response, origin);
        }
        
        // HIGH-PERFORMANCE: Use TenantContextManager with multi-layer caching
        const tenantInfo = await TenantContextManager.resolveTenant(tenant);
        
        // Set both headers properly for API routes
        response.headers.set('x-tenant-subdomain', tenant);
        if (tenantInfo?.uuid) {
          response.headers.set('x-tenant-id', tenantInfo.uuid);
        }
        
        return createSecureResponse(response, origin);
      }
      
      // For non-API routes, verify tenant exists before allowing subdomain access
      const tenantExists = await verifyTenantExists(tenant);
      
      if (!tenantExists) {
        // Tenant doesn't exist - redirect to main domain for onboarding
        const mainDomainUrl = new URL('https://docsflow.app/onboarding');
        return NextResponse.redirect(mainDomainUrl);
      }

      // SCHEMA-ALIGNED: Use exact database schema field names as cookie names
      const storedTenantId = request.cookies.get('tenant-id')?.value; // matches tenants.id (UUID)
      const userEmail = request.cookies.get('user_email')?.value;     // matches users.email (text)
      const authToken = request.cookies.get('access_token')?.value;   // Supabase token
      
      // HIGH-PERFORMANCE: Use TenantContextManager with multi-layer caching
      const tenantInfo = await TenantContextManager.resolveTenant(tenant);
      const tenantUUID = tenantInfo?.uuid || null;
      
      // DEBUGGING: Log detailed authentication state
      console.log(`🔍 [MIDDLEWARE] ${tenant} subdomain auth check:`, {
        pathname,
        storedTenantId: storedTenantId ? `${storedTenantId.substring(0, 8)}...` : 'MISSING',
        userEmail: userEmail || 'MISSING',
        authToken: authToken ? `${authToken.substring(0, 20)}...` : 'MISSING',
        tenantUUID: tenantUUID ? `${tenantUUID.substring(0, 8)}...` : 'MISSING'
      });
      
      // CRITICAL FIX: If user has a different tenant stored, ALWAYS clear and redirect
      if (storedTenantId && tenantUUID && storedTenantId !== tenantUUID) {
        console.log(`⚠️ Tenant mismatch detected! Stored UUID: ${storedTenantId}, Current UUID: ${tenantUUID} (subdomain: ${tenant})`);
        console.log(`🧹 [MIDDLEWARE] NUCLEAR CLEANUP: Clearing ALL stale cookies and forcing fresh auth`);
        
        // Create clean redirect to auth-redirect page
        const cleanAuthUrl = `https://${tenant}.docsflow.app/auth-redirect`;
        const response = NextResponse.redirect(new URL(cleanAuthUrl));
        
        // NUCLEAR OPTION: Clear ALL possible auth cookie variants
        const cookieVariants = [
          'tenant-id', 'user_email', 'user-email', 'access_token', 'refresh_token', 
          'auth-token', 'refresh-token', 'user-name', 'user_name', 'onboarding-complete',
          'sb-lhcopwwiqwjpzbdnjovo-auth-token', 'sb-lhcopwwiqwjpzbdnjovo-refresh-token'
        ];
        
        cookieVariants.forEach(cookieName => {
          // Clear for current domain
          response.cookies.delete(cookieName);
          // Force expire for all domain variants
          response.cookies.set(cookieName, '', { 
            expires: new Date(0), 
            path: '/', 
            domain: '.docsflow.app' 
          });
          response.cookies.set(cookieName, '', { 
            expires: new Date(0), 
            path: '/', 
            domain: `${tenant}.docsflow.app` 
          });
        });
        
        console.log(`🔄 FORCED REDIRECT: Redirecting to clean auth flow at ${cleanAuthUrl}`);
        return createSecureResponse(response, origin);
      }

      // If root path, check if user is authenticated
      if (pathname === '/' || pathname === '') {
        if (userEmail && authToken && storedTenantId && tenantUUID && storedTenantId === tenantUUID) {
          // User is authenticated AND on the correct tenant - redirect to dashboard on same tenant subdomain
          const dashboardUrl = `https://${tenant}.docsflow.app/dashboard`;
          console.log(`🎯 Redirecting authenticated user to dashboard: ${dashboardUrl}`);
          return NextResponse.redirect(new URL(dashboardUrl));
        } else {
          // User is NOT authenticated or tenant mismatch - redirect to LOGIN on tenant subdomain
          const loginUrl = `https://${tenant}.docsflow.app/login`;
          console.log(`🔐 Redirecting to tenant login: ${loginUrl}`);
          return NextResponse.redirect(new URL(loginUrl));
        }
      }
      
      // CRITICAL: Check session bridge FIRST before any other logic
      const sessionBridge = request.nextUrl.searchParams.get('session_bridge');
      if (pathname === '/login' && sessionBridge === 'true') {
        console.log(`🌉 Session bridge detected on login page - allowing token processing`);
        const response = NextResponse.next();
        response.headers.set('x-tenant-id', tenantUUID);
        response.headers.set('x-tenant-subdomain', tenant);
        return createSecureResponse(response, origin);
      }
      
      // PREVENT REDIRECT LOOPS: Allow login/register pages to load normally (but AFTER session bridge check)
      if (pathname === '/login' || pathname === '/register' || pathname.startsWith('/auth/')) {
        console.log(`✅ Allowing auth page to load: ${pathname}`);
        const response = NextResponse.next();
        response.headers.set('x-tenant-id', tenantUUID);
        response.headers.set('x-tenant-subdomain', tenant);
        return createSecureResponse(response, origin);
      }
      
      // For authenticated users on correct tenant, allow access with proper tenant context
      if (userEmail && authToken && storedTenantId && tenantUUID && storedTenantId === tenantUUID) {
        console.log(`✅ [MIDDLEWARE] User authenticated for tenant ${tenant} - allowing access to ${pathname}`);
        const response = NextResponse.next();
        response.headers.set('x-tenant-id', tenantUUID);
        response.headers.set('x-tenant-subdomain', tenant);
        return createSecureResponse(response, origin);
      }
      
      // For unauthenticated users on protected pages, redirect to login (but NOT if already on login)
      if (pathname !== '/login' && pathname !== '/register') {
        const loginUrl = `https://${tenant}.docsflow.app/login`;
        console.log(`🔐 [MIDDLEWARE] Redirecting unauthenticated user to login: ${loginUrl}`);
        console.log(`🔍 [MIDDLEWARE] Auth failure reason:`, {
          hasEmail: !!userEmail,
          hasToken: !!authToken,
          hasTenantId: !!storedTenantId,
          tenantMatch: storedTenantId === tenantUUID
        });
        return NextResponse.redirect(new URL(loginUrl));
      }
      
      // Fallback: allow the request to continue
      const response = NextResponse.next();
      response.headers.set('x-tenant-id', tenantUUID);
      response.headers.set('x-tenant-subdomain', tenant);
      return createSecureResponse(response, origin);
    }

    // Handle root domain (docsflow.app) access
    console.log(`🔍 [MIDDLEWARE] Checking main domain condition: hostname='${hostname}' vs 'docsflow.app'|'www.docsflow.app'|'localhost'`);
    if (hostname === 'docsflow.app' || hostname === 'www.docsflow.app' || hostname === 'localhost') {
      console.log(`🔍 [MIDDLEWARE] ✅ MATCHED main domain condition - Processing: ${hostname}${pathname}`);
      
      // Allow these routes on root domain
      if (pathname.startsWith('/onboarding') || 
          pathname.startsWith('/api') || 
          pathname.startsWith('/login') ||
          pathname.startsWith('/register') ||
          pathname.startsWith('/dashboard') ||
          pathname === '/') {
        console.log(`🔍 [MIDDLEWARE] Allowing main domain route: ${pathname}`);
        // Continue to the backend route handler
        const response = NextResponse.next();
        return createSecureResponse(response, origin);
      }
      
      // ARCHITECTURAL ROOT FIX: Standardized authentication check for main domain
      // Use SAME cookie names as subdomain logic for consistency
      console.log(`🔍 [MIDDLEWARE] Checking auth for main domain user on: ${pathname}`);
      const cookies = request.cookies;
      // STANDARDIZED: Use same cookie names as subdomain logic (line 202-204)
      const authToken = cookies.get('access_token')?.value;
      const userEmail = cookies.get('user_email')?.value;
      const storedTenantId = cookies.get('tenant-id')?.value;
      
      console.log(`🔍 [MIDDLEWARE] Auth check - Token: ${authToken ? 'EXISTS' : 'MISSING'}, Email: ${userEmail || 'MISSING'}, TenantId: ${storedTenantId || 'MISSING'}`);
      
      if (authToken && userEmail && storedTenantId) {
        console.log(`🔍 [MIDDLEWARE] User authenticated, resolving tenant: ${storedTenantId}`);
        // Get tenant subdomain from TenantContextManager
        const tenantInfo = await TenantContextManager.resolveTenant(storedTenantId);
        console.log(`🔍 [MIDDLEWARE] Tenant resolution result:`, tenantInfo);
        if (tenantInfo?.subdomain) {
          const tenantUrl = `https://${tenantInfo.subdomain}.docsflow.app${pathname}`;
          console.log(`🎯 [MIDDLEWARE] REDIRECTING authenticated user from main domain to tenant: ${tenantUrl}`);
          return NextResponse.redirect(new URL(tenantUrl));
        } else {
          console.log(`❌ [MIDDLEWARE] No tenant subdomain found for tenant ID: ${storedTenantId}`);
        }
      } else {
        console.log(`🔍 [MIDDLEWARE] User not authenticated or missing tenant context on main domain`);
      }
    }

    // Handle backend domain access - redirect to main domain for non-API routes
    if (hostname.includes('ai-lead-router-saas') && hostname.includes('vercel.app')) {
      
      // Allow API routes and onboarding on backend domain
      if (pathname.startsWith('/api') || pathname.startsWith('/onboarding') || pathname.startsWith('/app/')) {
        const response = NextResponse.next();
        return createSecureResponse(response, origin);
      }
      
      // Redirect non-API routes to main domain
      return NextResponse.redirect(new URL(`https://docsflow.app${pathname}`, request.url), 301);
    }

    // Default - allow frontend to handle
    console.log(`🔍 [MIDDLEWARE] Default handler - allowing frontend to handle: ${hostname}${pathname}`);
    const response = NextResponse.next();
    return createSecureResponse(response, request.headers.get('origin'));
    
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