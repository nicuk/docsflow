import { NextRequest } from 'next/server';
import { auditLogger, AUDIT_ACTIONS } from './audit-logger';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Enhanced rate limiting with audit logging
 */
export function checkRateLimit(
  request: NextRequest,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): boolean {
  const clientIp = getClientIP(request);
  const now = Date.now();
  const windowStart = now - windowMs;

  // Clean up old entries
  for (const [ip, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(ip);
    }
  }

  const current = rateLimitStore.get(clientIp) || { count: 0, resetTime: now + windowMs };

  if (current.count >= maxRequests) {
    // Log rate limit exceeded
    auditLogger.logSecurityEvent(
      AUDIT_ACTIONS.RATE_LIMIT_EXCEEDED,
      {
        clientIp,
        requests: current.count,
        maxRequests,
        windowMs,
        path: request.nextUrl.pathname
      },
      clientIp,
      request.headers.get('user-agent') || undefined
    );
    
    return false;
  }

  current.count++;
  rateLimitStore.set(clientIp, current);
  return true;
}

/**
 * Get client IP address with proxy support
 */
export function getClientIP(request: NextRequest): string {
  // Check for forwarded IP (from proxy/CDN)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Check for real IP header
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to connection remote address
  return request.headers.get('x-vercel-forwarded-for') || 'unknown';
}

/**
 * Detect suspicious activity patterns
 */
export function detectSuspiciousActivity(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') || '';
  const clientIp = getClientIP(request);
  const pathname = request.nextUrl.pathname;

  // Known bot patterns
  const suspiciousPatterns = [
    /curl/i,
    /wget/i,
    /python/i,
    /scanner/i,
    /bot/i,
    /crawler/i,
    /spider/i
  ];

  // Check for suspicious user agents
  const isSuspiciousUA = suspiciousPatterns.some(pattern => pattern.test(userAgent));

  // Check for suspicious paths
  const suspiciousPaths = [
    /\.env/,
    /wp-admin/,
    /admin\.php/,
    /config\./,
    /\.git/,
    /phpinfo/,
    /passwd/
  ];

  const isSuspiciousPath = suspiciousPaths.some(pattern => pattern.test(pathname));

  if (isSuspiciousUA || isSuspiciousPath) {
    auditLogger.logSecurityEvent(
      AUDIT_ACTIONS.SUSPICIOUS_ACTIVITY,
      {
        userAgent,
        pathname,
        reason: isSuspiciousUA ? 'suspicious_user_agent' : 'suspicious_path',
        detected_patterns: suspiciousPatterns.filter(p => p.test(userAgent)).map(p => p.toString())
      },
      clientIp,
      userAgent
    );

    return true;
  }

  return false;
}

/**
 * Input sanitization and validation
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, ''); // Remove data: protocol
}

/**
 * Validate email format with additional security checks
 */
export function validateEmail(email: string): { valid: boolean; reason?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Email is required' };
  }

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, reason: 'Invalid email format' };
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /script/i,
    /javascript/i,
    /vbscript/i,
    /<.*>/,
    /\.\./
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(email)) {
      return { valid: false, reason: 'Email contains suspicious content' };
    }
  }

  // Check length
  if (email.length > 254) {
    return { valid: false, reason: 'Email is too long' };
  }

  return { valid: true };
}

/**
 * Validate subdomain with security checks
 */
export function validateSubdomain(subdomain: string): { valid: boolean; reason?: string } {
  if (!subdomain || typeof subdomain !== 'string') {
    return { valid: false, reason: 'Subdomain is required' };
  }

  // Must be lowercase alphanumeric with hyphens
  const subdomainRegex = /^[a-z0-9-]+$/;
  if (!subdomainRegex.test(subdomain)) {
    return { valid: false, reason: 'Subdomain can only contain lowercase letters, numbers, and hyphens' };
  }

  // Length check
  if (subdomain.length < 3 || subdomain.length > 63) {
    return { valid: false, reason: 'Subdomain must be between 3 and 63 characters' };
  }

  // Cannot start or end with hyphen
  if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
    return { valid: false, reason: 'Subdomain cannot start or end with a hyphen' };
  }

  // Reserved subdomains
  const reserved = [
    'www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog', 'shop', 'store',
    'support', 'help', 'docs', 'cdn', 'static', 'assets', 'test', 'staging',
    'dev', 'demo', 'beta', 'alpha', 'preview', 'dashboard', 'console',
    'root', 'system', 'config', 'backup', 'monitoring', 'status'
  ];

  if (reserved.includes(subdomain)) {
    return { valid: false, reason: 'This subdomain is reserved' };
  }

  return { valid: true };
}

/**
 * Generate Content Security Policy header
 */
export function getCSPHeader(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' https:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
}

/**
 * Security headers for responses
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Content-Security-Policy': getCSPHeader(),
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  };
}