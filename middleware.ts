import { type NextRequest, NextResponse } from 'next/server';

// TEMPORARY: Middleware disabled for debugging
export async function middleware(request: NextRequest) {
  console.log('Middleware bypassed for debugging');
  return NextResponse.next();
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
}

/*
// ORIGINAL MIDDLEWARE - DISABLED FOR DEBUGGING
import { type NextRequest, NextResponse } from 'next/server';

// Inline configuration to avoid import issues in edge runtime
const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ai-lead-router-saas.vercel.app';

function extractSubdomain(request: NextRequest): string | null {
  try {
    const url = request.url;
    const host = request.headers.get('host') || '';
    
    console.log('Extracting subdomain from:', { url, host });
    
    // Parse the hostname from the request
    const hostname = new URL(url).hostname;
    
    // Remove 'www.' if present
    const normalizedHostname = hostname.replace(/^www\./, '');
    
    // Format root domain for comparison (remove port if present)
    const rootDomainFormatted = rootDomain.split(':')[0];
    
    // Check if this is a subdomain
    const isSubdomain = normalizedHostname !== rootDomainFormatted && 
                       normalizedHostname.endsWith(`.${rootDomainFormatted}`);
    
    console.log('Subdomain check:', { 
      normalizedHostname, 
      rootDomainFormatted, 
      isSubdomain 
    });
    
    return isSubdomain ? hostname.replace(`.${rootDomainFormatted}`, '') : null;
  } catch (error) {
    console.error('Error in extractSubdomain:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  try {
    const { pathname, search, hash } = request.nextUrl;
    const subdomain = extractSubdomain(request);

    console.log('Middleware processing:', {
      pathname,
      subdomain,
      host: request.headers.get('host'),
      url: request.url
    });

    if (subdomain) {
      console.log(`Processing subdomain: ${subdomain}`);
      
      // Handle admin routes on subdomains
      if (pathname.startsWith('/admin')) {
        console.log('Admin route on subdomain, allowing through');
        return NextResponse.next();
      }
      
      // Rewrite subdomain root to tenant dashboard
      if (pathname === '/') {
        const rewriteUrl = new URL(`/app/${subdomain}${search}${hash}`, request.url);
        console.log('Rewriting to:', rewriteUrl.toString());
        return NextResponse.rewrite(rewriteUrl);
      }
      
      // Handle other subdomain routes
      if (!pathname.startsWith('/app/')) {
        const rewriteUrl = new URL(`/app/${subdomain}${pathname}${search}${hash}`, request.url);
        console.log('Rewriting subdomain route to:', rewriteUrl.toString());
        return NextResponse.rewrite(rewriteUrl);
      }
    }

    // On the root domain, allow normal access
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url,
      host: request.headers.get('host')
    });
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
*/