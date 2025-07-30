import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { 
  checkRateLimit, 
  extractTenantFromHostname, 
  createSecureResponse,
  handlePreflight
} from './lib/security-middleware';

export default function middleware(request: NextRequest) {
  try {
    const { pathname, hostname } = request.nextUrl;
    const origin = request.headers.get('origin');
    
    // Handle OPTIONS preflight requests
    if (request.method === 'OPTIONS') {
      return handlePreflight(request);
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

    console.log(`[Middleware] Processing: ${hostname}${pathname}`);

    // Extract tenant from hostname
    const tenant = extractTenantFromHostname(hostname);

    // Route tenant subdomains to the tenant-specific app page
    if (tenant) {
      console.log(`[Middleware] Tenant subdomain detected: ${hostname} -> Rewriting to /app/${tenant}`);
      const response = NextResponse.rewrite(new URL(`/app/${tenant}${pathname}`, request.url));
      return createSecureResponse(response, origin);
    }

    // These routes should be handled by the backend project itself
    // when this middleware runs on the backend domain
    if ((hostname === 'docsflow.app' || hostname === 'www.docsflow.app') && 
        (pathname.startsWith('/onboarding') || pathname.startsWith('/api'))) {
      console.log(`[Middleware] Backend route detected: ${pathname}`);
      // Continue to the backend route handler
      const response = NextResponse.next();
      return createSecureResponse(response, origin);
    }

    // Handle backend domain access - redirect to main domain for non-API routes
    if (hostname.includes('ai-lead-router-saas') && hostname.includes('vercel.app')) {
      console.log(`[Middleware] Backend domain access: ${pathname}`);
      
      // Allow API routes and onboarding on backend domain
      if (pathname.startsWith('/api') || pathname.startsWith('/onboarding') || pathname.startsWith('/app/')) {
        const response = NextResponse.next();
        return createSecureResponse(response, origin);
      }
      
      // Redirect non-API routes to main domain
      return NextResponse.redirect(new URL(`https://docsflow.app${pathname}`, request.url), 301);
    }

    // Default - allow frontend to handle
    console.log(`[Middleware] Default handling for: ${hostname}${pathname}`);
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
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 