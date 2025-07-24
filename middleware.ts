import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  
  // Extract subdomain
  const rootDomain = 'ai-lead-router-saas.vercel.app';
  const subdomain = hostname.replace(`.${rootDomain}`, '');
  
  // If this is a subdomain (not the root domain)
  if (subdomain !== hostname && subdomain !== 'www') {
    // Rewrite to subdomain page
    url.pathname = `/s/${subdomain}`;
    return NextResponse.rewrite(url);
  }
  
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