import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function middleware(request: NextRequest) {
  try {
    const { pathname, hostname } = request.nextUrl;
    
    // Skip middleware for API routes and static files
    if (pathname.startsWith('/api') || 
        pathname.startsWith('/_next') || 
        pathname.startsWith('/favicon.ico') ||
        pathname.startsWith('/sitemap.xml') ||
        pathname.startsWith('/robots.txt')) {
      return NextResponse.next();
    }

    console.log(`[Middleware] Processing: ${hostname}${pathname}`);

    // Handle subdomain routing - enhanced logic
    const hostParts = hostname.split('.');
    const subdomain = hostParts[0];
    
    // Define known main domains
    const mainDomains = ['www', 'docsflow', 'ai-lead-router-saas', 'localhost', '127.0.0.1'];
    const isMainDomain = mainDomains.includes(subdomain) || hostname === 'docsflow.app';
    const isSubdomain = !isMainDomain && hostParts.length >= 2 && subdomain !== '';
    
    // Handle subdomain routing
    if (isSubdomain && subdomain) {
      console.log(`[Middleware] Subdomain detected: ${subdomain}, rewriting to /app/${subdomain}`);
      
      // Rewrite subdomain to tenant dashboard with proper URL construction
      const tenantUrl = new URL(request.url);
      tenantUrl.pathname = `/app/${subdomain}${pathname === '/' ? '' : pathname}`;
      tenantUrl.hostname = hostname.includes('docsflow.app') ? 'docsflow.app' : hostname;
      
      return NextResponse.rewrite(tenantUrl);
    }

    // Handle main domain routing
    if (hostname === 'docsflow.app' || hostname === 'www.docsflow.app') {
      console.log(`[Middleware] Main domain access: ${pathname}`);
      return NextResponse.next();
    }

    // Handle backend domain routing
    if (hostname.includes('ai-lead-router-saas') && hostname.includes('vercel.app')) {
      console.log(`[Middleware] Backend domain access: ${pathname}`);
      
      // Allow API routes on backend domain
      if (pathname.startsWith('/api')) {
        return NextResponse.next();
      }
      
      // Redirect non-API routes to main domain
      const mainDomainUrl = new URL(`https://docsflow.app${pathname}`);
      return NextResponse.redirect(mainDomainUrl, 301);
    }

    // Default case - allow the request to proceed
    console.log(`[Middleware] Default handling for: ${hostname}${pathname}`);
    return NextResponse.next();
    
  } catch (error) {
    // If middleware fails, log the error and allow the request to proceed
    console.error('Middleware error:', error);
    return NextResponse.next();
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