import { NextResponse } from 'next/server';

/**
 * Cookie configuration for cross-subdomain session persistence
 */
export const COOKIE_CONFIG = {
  domain: process.env.NODE_ENV === 'production' ? '.docsflow.app' : undefined,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/'
};

/**
 * Create a NextResponse with session cookies set using proper Set-Cookie headers
 * This replaces the unsupported NextResponse.cookies.set() pattern
 */
export function createResponseWithSessionCookies(
  body: any,
  cookies: {
    userEmail?: string;
    userName?: string;
    tenantId?: string;
    onboardingComplete?: boolean;
  },
  status: number = 200,
  additionalHeaders: Record<string, string> = {}
): NextResponse {
  const response = NextResponse.json(body, { status });
  
  // Add CORS headers for cross-domain cookie support
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', 
    process.env.NODE_ENV === 'production' 
      ? 'https://*.docsflow.app' 
      : 'http://localhost:3000'
  );
  
  // Set cookies using Set-Cookie headers (the proper way)
  const cookieOptions = `; Path=${COOKIE_CONFIG.path}; Max-Age=${COOKIE_CONFIG.maxAge}; SameSite=${COOKIE_CONFIG.sameSite}${COOKIE_CONFIG.httpOnly ? '; HttpOnly' : ''}${COOKIE_CONFIG.secure ? '; Secure' : ''}${COOKIE_CONFIG.domain ? `; Domain=${COOKIE_CONFIG.domain}` : ''}`;
  
  if (cookies.userEmail) {
    response.headers.append('Set-Cookie', `user-email=${cookies.userEmail}${cookieOptions}`);
  }
  
  if (cookies.userName) {
    response.headers.append('Set-Cookie', `user-name=${encodeURIComponent(cookies.userName)}${cookieOptions}`);
  }
  
  if (cookies.tenantId) {
    response.headers.append('Set-Cookie', `tenant-id=${cookies.tenantId}${cookieOptions}`);
  }
  
  if (cookies.onboardingComplete) {
    response.headers.append('Set-Cookie', `onboarding-complete=true${cookieOptions}`);
  }
  
  // Add any additional headers
  Object.entries(additionalHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * Create a standard NextResponse with CORS headers
 */
export function createCORSResponse(
  body: any,
  status: number = 200,
  additionalHeaders: Record<string, string> = {}
): NextResponse {
  const response = NextResponse.json(body, { status });
  
  // Add CORS headers
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', 
    process.env.NODE_ENV === 'production' 
      ? 'https://*.docsflow.app' 
      : 'http://localhost:3000'
  );
  
  // Add any additional headers
  Object.entries(additionalHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}
