import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

// Platform admin configuration
const PLATFORM_ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@docsflow.app';
const PLATFORM_ADMIN_SECRET = process.env.PLATFORM_ADMIN_SECRET || 'your-secure-secret-key';

interface AdminSession {
  email: string;
  isAuthenticated: boolean;
  expiresAt: number;
}

/**
 * Generate a secure admin token
 */
export function generateAdminToken(email: string): string {
  const timestamp = Date.now();
  const payload = `${email}:${timestamp}`;
  const signature = createHash('sha256')
    .update(payload + PLATFORM_ADMIN_SECRET)
    .digest('hex');
  
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

/**
 * Verify admin token
 */
export function verifyAdminToken(token: string): AdminSession | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [email, timestamp, signature] = decoded.split(':');
    
    // Verify signature
    const expectedSignature = createHash('sha256')
      .update(`${email}:${timestamp}` + PLATFORM_ADMIN_SECRET)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Check if token is expired (24 hours)
    const tokenAge = Date.now() - parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (tokenAge > maxAge) {
      return null;
    }
    
    // Verify it's the platform admin
    if (email !== PLATFORM_ADMIN_EMAIL) {
      return null;
    }
    
    return {
      email,
      isAuthenticated: true,
      expiresAt: parseInt(timestamp) + maxAge
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Check if request has platform admin authentication
 */
export function isPlatformAdmin(request: NextRequest): boolean {
  // Check for auth token in cookie
  const authCookie = request.cookies.get('platform-admin-token');
  if (!authCookie?.value) {
    return false;
  }
  
  const session = verifyAdminToken(authCookie.value);
  return session?.isAuthenticated === true;
}

/**
 * Middleware for protecting platform admin routes
 */
export function requirePlatformAdmin(request: NextRequest): Response | null {
  if (!isPlatformAdmin(request)) {
    // Redirect to admin login
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return Response.redirect(loginUrl, 302);
  }
  
  return null; // Allow access
}

/**
 * Simple admin authentication (for demo purposes)
 * In production, integrate with your preferred auth provider
 */
export function authenticateAdmin(email: string, password: string): string | null {
  // Simple check - in production, use proper authentication
  const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD || 'admin123';
  
  if (email === PLATFORM_ADMIN_EMAIL && password === adminPassword) {
    return generateAdminToken(email);
  }
  
  return null;
}

/**
 * Log admin actions for audit trail
 */
export function logAdminAction(action: string, details: any, adminEmail: string) {
  // Import audit logger dynamically to avoid circular dependencies
  import('./audit-logger').then(({ auditLogger, AUDIT_ACTIONS }) => {
    auditLogger.logPlatformAdminAction(
      action,
      adminEmail,
      {
        type: 'settings',
        id: 'platform'
      },
      details,
      'medium'
    );
  });
}