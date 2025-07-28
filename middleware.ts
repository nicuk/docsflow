import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function middleware(request: NextRequest) {
  try {
    const { pathname, hostname } = request.nextUrl;
    
    // Skip middleware for API routes and static files
    if (pathname.startsWith('/api') || 
        pathname.startsWith('/_next') || 
        pathname.startsWith('/favicon.ico')) {
      return NextResponse.next();
    }

    // Handle subdomain routing - simplified
    const hostParts = hostname.split('.');
    const subdomain = hostParts[0];
    
    // Define known main domains
    const mainDomains = ['www', 'docsflow', 'ai-lead-router-saas', 'localhost', '127.0.0.1'];
    const isSubdomain = !mainDomains.includes(subdomain) && hostParts.length > 1;
    
    if (isSubdomain && subdomain) {
      // Route subdomain requests to tenant dashboard
      const tenantUrl = new URL(`/app/${subdomain}`, request.url);
      return NextResponse.rewrite(tenantUrl);
    }

    // Handle main domain routing
    if (hostname === 'docsflow.app' || hostname === 'www.docsflow.app') {
      // Main landing page - no changes needed
      return NextResponse.next();
    }

    // Handle backend domain routing
    if (hostname === 'ai-lead-router-saas.vercel.app' || hostname.includes('ai-lead-router-saas')) {
      // Backend API domain - allow access to API routes
      if (pathname.startsWith('/api')) {
        return NextResponse.next();
      }
      
      // Non-API routes on backend domain should redirect to main domain
      const mainDomainUrl = new URL(pathname, 'https://docsflow.app');
      return NextResponse.redirect(mainDomainUrl);
    }

    // Default case - allow the request to proceed
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