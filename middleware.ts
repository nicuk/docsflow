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

export default function middleware(request: NextRequest) {
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



    // Extract tenant from hostname
    const tenant = extractTenantFromHostname(hostname);

    // Route tenant subdomains to the tenant-specific dashboard
    if (tenant) {

      // If root path, check if user has completed onboarding
      if (pathname === '/' || pathname === '') {
        // Check onboarding completion from cookies
        const onboardingComplete = request.cookies.get('onboarding-complete')?.value === 'true';
        
        if (onboardingComplete) {
          // User has completed onboarding - allow dashboard access
          const response = NextResponse.rewrite(new URL(`/app/${tenant}/dashboard`, request.url));
          response.headers.set('x-tenant-id', tenant);
          return createSecureResponse(response, origin);
        } else {
          // User hasn't completed onboarding - redirect to onboarding
          return NextResponse.redirect(new URL('/onboarding', request.url));
        }
      }
      // Otherwise, preserve the path structure
      const response = NextResponse.rewrite(new URL(`/app/${tenant}${pathname}`, request.url));

      // 🚨 Inject the tenant ID into the request headers for frontend context
      response.headers.set('x-tenant-id', tenant);

      return createSecureResponse(response, origin);
    }

    // These routes should be handled by the backend project itself
    // when this middleware runs on the backend domain
    if ((hostname === 'docsflow.app' || hostname === 'www.docsflow.app') && 
        (pathname.startsWith('/onboarding') || pathname.startsWith('/api'))) {

      // Continue to the backend route handler
      const response = NextResponse.next();
      return createSecureResponse(response, origin);
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