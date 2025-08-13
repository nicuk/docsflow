import { NextResponse } from 'next/server';

/**
 * Cookie configurations for different types of data
 */
export const COOKIE_CONFIG = {
  // For sensitive auth tokens (httpOnly)
  AUTH: {
    domain: process.env.NODE_ENV === 'production' ? '.docsflow.app' : undefined,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  },
  // For user display data (readable by JavaScript)
  USER: {
    domain: process.env.NODE_ENV === 'production' ? '.docsflow.app' : undefined,
    httpOnly: false, // Allow JavaScript access for UI display
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  }
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
  // Use USER config for display data (readable by JavaScript)
  const userCookieOptions = `; Path=${COOKIE_CONFIG.USER.path}; Max-Age=${COOKIE_CONFIG.USER.maxAge}; SameSite=${COOKIE_CONFIG.USER.sameSite}${COOKIE_CONFIG.USER.httpOnly ? '; HttpOnly' : ''}${COOKIE_CONFIG.USER.secure ? '; Secure' : ''}${COOKIE_CONFIG.USER.domain ? `; Domain=${COOKIE_CONFIG.USER.domain}` : ''}`;
  
  // Use AUTH config for sensitive data (httpOnly)
  const authCookieOptions = `; Path=${COOKIE_CONFIG.AUTH.path}; Max-Age=${COOKIE_CONFIG.AUTH.maxAge}; SameSite=${COOKIE_CONFIG.AUTH.sameSite}${COOKIE_CONFIG.AUTH.httpOnly ? '; HttpOnly' : ''}${COOKIE_CONFIG.AUTH.secure ? '; Secure' : ''}${COOKIE_CONFIG.AUTH.domain ? `; Domain=${COOKIE_CONFIG.AUTH.domain}` : ''}`;
  
  if (cookies.userEmail) {
    response.headers.append('Set-Cookie', `user-email=${cookies.userEmail}${userCookieOptions}`);
  }
  
  if (cookies.userName) {
    response.headers.append('Set-Cookie', `user-name=${encodeURIComponent(cookies.userName)}${userCookieOptions}`);
  }
  
  if (cookies.tenantId) {
    response.headers.append('Set-Cookie', `tenant-id=${cookies.tenantId}${authCookieOptions}`);
  }
  
  if (cookies.onboardingComplete) {
    response.headers.append('Set-Cookie', `onboarding-complete=true${userCookieOptions}`);
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
