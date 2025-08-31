import { NextRequest, NextResponse } from 'next/server';

/**
 * Security middleware utilities for Edge Functions
 * Compatible with Vercel Edge Runtime
 */

export interface SecurityConfig {
  allowedOrigins: string[];
  hmacSecret?: string;
  jwtSecret?: string;
  rateLimitRpm?: number;
}

const DEFAULT_CONFIG: SecurityConfig = {
  allowedOrigins: [
    'https://docsflow.app',
    'https://www.docsflow.app',
    'https://*.docsflow.app'
  ],
  rateLimitRpm: 100
};

/**
 * Generate HMAC signature using Web Crypto API (Edge Runtime compatible)
 */
export async function generateHmacSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );
  
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify HMAC signature using Web Crypto API
 */
export async function verifyHmacSignature(data: string, signature: string, secret: string): Promise<boolean> {
  const expectedSignature = await generateHmacSignature(data, secret);
  return signature === expectedSignature;
}

/**
 * Get secure CORS headers
 */
export function getSecureCORSHeaders(origin?: string | null, config: SecurityConfig = DEFAULT_CONFIG): Record<string, string> {
  const isAllowedOrigin = origin && config.allowedOrigins.some(allowed => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace('*', '.*');
      return new RegExp(pattern).test(origin);
    }
    return allowed === origin;
  });

  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin! : config.allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Auth-Token, X-Tenant-ID, X-Tenant-Subdomain, X-HMAC-Signature',
    'Access-Control-Allow-Credentials': 'true',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
  };
}

/**
 * Rate limiting using in-memory store (for Edge Functions)
 * In production, consider using Redis or KV store
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Extract IP address from request headers (Edge Runtime compatible)
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  return 'unknown';
}

export function checkRateLimit(request: NextRequest, limit: number = 100): boolean {
  const ip = getClientIP(request);
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  
  const key = `${ip}`;
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= limit) {
    return false;
  }
  
  current.count++;
  return true;
}

/**
 * Extract tenant from hostname
 */
export function extractTenantFromHostname(hostname: string): string | null {
  if (hostname === 'docsflow.app' || hostname === 'www.docsflow.app') {
    return null;
  }
  
  // Exclude system subdomains from being treated as tenants
  const systemSubdomains = ['api', 'www', 'admin', 'cdn', 'mail', 'support', 'docs'];
  
  if (hostname.endsWith('.docsflow.app')) {
    const subdomain = hostname.split('.')[0];
    
    // Don't treat system subdomains as tenants
    if (systemSubdomains.includes(subdomain)) {
      return null;
    }
    
    return subdomain;
  }
  
  return null;
}

/**
 * Validate JWT token (simplified version)
 * In production, use a proper JWT library
 */
export function validateJWTToken(token: string, secret: string): boolean {
  try {
    // This is a simplified validation - use proper JWT library in production
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Basic validation - implement proper JWT verification
    return true;
  } catch {
    return false;
  }
}

/**
 * Create secure response headers
 */
export function createSecureResponse(
  response: NextResponse,
  origin?: string | null,
  config: SecurityConfig = DEFAULT_CONFIG
): NextResponse {
  const headers = getSecureCORSHeaders(origin, config);
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * Handle OPTIONS preflight requests
 */
export function handlePreflight(request: NextRequest, config: SecurityConfig = DEFAULT_CONFIG): NextResponse {
  const origin = request.headers.get('origin');
  const response = new NextResponse(null, { status: 200 });
  
  return createSecureResponse(response, origin, config);
}
