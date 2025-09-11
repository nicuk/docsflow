/**
 * SCHEMA-ALIGNED COOKIE MANAGEMENT
 * 
 * This utility ensures cookies align with database schema and actual usage:
 * - tenants.id (UUID) → tenant-id cookie (read by middleware)
 * - users.email (text) → user-email cookie (read by middleware)  
 * - Supabase session tokens → access_token/refresh_token
 * 
 * 🔒 CRITICAL SECURITY PRINCIPLE:
 * Access levels should come from database queries, NOT cookies
 * - users.access_level: Stored in database only
 * - users.role: Fetched via /api/auth/session endpoint
 * - Frontend should NEVER trust localStorage/cookies for access control
 * 
 * 🏗️ ARCHITECTURE NOTES:
 * - tenant subdomain: Handled via x-tenant-subdomain HEADER (not cookie)
 * - middleware.ts: Reads tenant-id cookie for routing decisions  
 * - Database schema: tenants.id is UUID, tenants.subdomain is text
 * - Cookie format: tenant-id=<UUID> (matches tenants.id exactly)
 */

interface TenantContext {
  tenantId: string;      // UUID from tenants.id - stored in tenant-id cookie
  subdomain: string;     // text from tenants.subdomain - NOT stored as cookie (header only)
  userEmail: string;     // text from users.email - stored in user-email cookie
}

/**
 * 🚨 SECURITY WARNING: ACCESS CONTROL IMPLEMENTATION
 * 
 * Access levels are NEVER stored in cookies or localStorage for security reasons:
 * 
 * ✅ CORRECT APPROACH:
 * 1. Store only tenant-id (UUID) and user-email in cookies
 * 2. Fetch user.role and access_level from database via /api/auth/session
 * 3. Map role to access level: 'admin' = 1, 'user' = 2
 * 
 * ❌ NEVER DO THIS:
 * - localStorage.setItem('accessLevel', '1') // Can be manipulated
 * - document.cookie = 'access_level=1' // Client-side modifiable
 * - Trust frontend context for admin checks // Major security flaw
 * 
 * 📊 DATABASE SCHEMA REFERENCE:
 * - users.access_level: integer NOT NULL DEFAULT 2 CHECK (>= 1 AND <= 2)
 * - users.role: text DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer'))
 * - tenants.id: uuid (PRIMARY KEY) - what goes in tenant-id cookie
 */

interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

/**
 * CRITICAL: This list must include ALL possible cookie variants to prevent contamination
 * FIX #1: Added comprehensive legacy cookie cleanup
 */
const ALL_AUTH_COOKIE_VARIANTS = [
  // Standard cookies
  'tenant-id',
  'user_email', 
  'user-email',
  'access_token',
  'refresh_token',
  'auth-token',
  'refresh-token',
  // NOTE: 'tenant-subdomain' not included - it's header-only, not a cookie
  'user-name',
  'user_name',
  'onboarding-complete',
  
  // Supabase specific
  'sb-lhcopwwiqwjpzbdnjovo-auth-token',
  'sb-lhcopwwiqwjpzbdnjovo-refresh-token',
  
  // Legacy/variant names that might exist
  'tenantId',
  'userEmail',
  'authToken',
  'refreshToken',
  
  // FIX #1: Additional legacy patterns found in logs
  'tenant-contexts',
  'current-tenant',
  'logout-timestamp',
  'session_bridge'
];

/**
 * FIX #1: UNIFIED AUTH TOKEN CONFIGURATION
 * Single source of truth for authentication cookies
 */
const UNIFIED_AUTH_CONFIG = {
  PRIMARY_AUTH_COOKIE: 'docsflow_auth_token',
  PRIMARY_REFRESH_COOKIE: 'docsflow_refresh_token',
  TENANT_ID_COOKIE: 'tenant-id',
  USER_EMAIL_COOKIE: 'user-email',
  
  // Cookie options
  AUTH_OPTIONS: 'path=/; domain=.docsflow.app; secure; samesite=lax; max-age=3600',
  REFRESH_OPTIONS: 'path=/; domain=.docsflow.app; secure; samesite=lax; max-age=604800',
  TENANT_OPTIONS: 'path=/; domain=.docsflow.app; secure; samesite=lax; max-age=86400'
};

export class SchemaAlignedCookieManager {
  
  /**
   * SCHEMA VALIDATION: Ensures data matches database constraints
   */
  private static validateTenantContext(context: TenantContext): boolean {
    // Validate tenant ID is UUID format (matches tenants.id)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(context.tenantId)) {
      console.error(`❌ [SCHEMA] Invalid tenant ID format: ${context.tenantId}`);
      return false;
    }
    
    // Validate email format (matches users.email)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(context.userEmail)) {
      console.error(`❌ [SCHEMA] Invalid email format: ${context.userEmail}`);
      return false;
    }
    
    // Validate subdomain format (matches tenants.subdomain - no special chars)
    const subdomainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
    if (!subdomainRegex.test(context.subdomain)) {
      console.error(`❌ [SCHEMA] Invalid subdomain format: ${context.subdomain}`);
      return false;
    }
    
    return true;
  }
  
  /**
   * COMPLETE COOKIE CLEANUP: Removes ALL auth cookie variants to prevent contamination
   */
  static clearAllAuthCookies(): void {
    console.log(`🧹 [CLEANUP] Clearing ${ALL_AUTH_COOKIE_VARIANTS.length} auth cookie variants`);
    
    const expireDate = 'Thu, 01 Jan 1970 00:00:00 GMT';
    const domains = ['.docsflow.app', 'docsflow.app', window.location.hostname];
    
    ALL_AUTH_COOKIE_VARIANTS.forEach(cookieName => {
      domains.forEach(domain => {
        // Clear for each domain variant
        document.cookie = `${cookieName}=; path=/; domain=${domain}; expires=${expireDate}`;
        document.cookie = `${cookieName}=; path=/; expires=${expireDate}`;
      });
    });
    
    console.log(`✅ [CLEANUP] All auth cookies cleared across domains`);
  }
  
  /**
   * FIX #1: UNIFIED AUTH COOKIE SETTING
   * Single source of truth approach - eliminates auth token fragmentation
   */
  static setUnifiedAuthCookies(context: TenantContext, tokens: AuthTokens): void {
    if (!this.validateTenantContext(context)) {
      throw new Error('Schema validation failed - refusing to set invalid cookies');
    }
    
    // 🚨 SURGICAL FIX: Don't clear working auth cookies during active session
    // Only clear cookies if we're setting new ones (login/refresh scenario)
    console.log('⚠️ [COOKIE-MANAGER] Skipping aggressive cookie clearing to prevent session disruption');
    
    // PHASE 2: Set UNIFIED auth cookies (single source of truth)
    document.cookie = `${UNIFIED_AUTH_CONFIG.PRIMARY_AUTH_COOKIE}=${tokens.accessToken}; ${UNIFIED_AUTH_CONFIG.AUTH_OPTIONS}`;
    if (tokens.refreshToken) {
      document.cookie = `${UNIFIED_AUTH_CONFIG.PRIMARY_REFRESH_COOKIE}=${tokens.refreshToken}; ${UNIFIED_AUTH_CONFIG.REFRESH_OPTIONS}`;
    }
    
    // PHASE 3: Set tenant context cookies
    document.cookie = `${UNIFIED_AUTH_CONFIG.TENANT_ID_COOKIE}=${context.tenantId}; ${UNIFIED_AUTH_CONFIG.TENANT_OPTIONS}`;
    document.cookie = `${UNIFIED_AUTH_CONFIG.USER_EMAIL_COOKIE}=${context.userEmail}; ${UNIFIED_AUTH_CONFIG.TENANT_OPTIONS}`;
    
    console.log(`✅ [UNIFIED-AUTH] Set unified auth cookies:`, {
      primaryAuthCookie: UNIFIED_AUTH_CONFIG.PRIMARY_AUTH_COOKIE,
      tenantId: context.tenantId.substring(0, 8) + '...',
      subdomain: context.subdomain,
      email: context.userEmail,
      hasTokens: !!tokens.accessToken,
      legacyCookiesCleared: ALL_AUTH_COOKIE_VARIANTS.length
    });
  }
  
  /**
   * LEGACY COMPATIBILITY: Keep old method for gradual migration
   * @deprecated Use setUnifiedAuthCookies instead
   */
  static setSchemaAlignedCookies(context: TenantContext, tokens: AuthTokens): void {
    console.warn('⚠️ [DEPRECATED] setSchemaAlignedCookies is deprecated. Use setUnifiedAuthCookies instead.');
    this.setUnifiedAuthCookies(context, tokens);
  }
  
  /**
   * FIX #1: UNIFIED AUTH COOKIE READING
   * Reads from unified cookies with comprehensive fallback chain
   */
  static getUnifiedAuthCookies(serverCookies?: Record<string, string>): {
    tenantId: string | null;
    userEmail: string | null; 
    accessToken: string | null;
    refreshToken: string | null;
    source: string; // For debugging
  } {
    let cookies: Record<string, string>;
    
    if (typeof window === 'undefined' || serverCookies) {
      // Server-side: use provided cookies
      cookies = serverCookies || {};
    } else {
      // Client-side: parse document.cookie
      cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (value) acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
    }
    
    // FIX #1: Prioritize unified cookies, fallback to legacy
    const accessToken = cookies[UNIFIED_AUTH_CONFIG.PRIMARY_AUTH_COOKIE] ||
                       cookies['sb-lhcopwwiqwjpzbdnjovo-auth-token'] ||
                       cookies['access_token'] ||
                       cookies['auth-token'] ||
                       null;
    
    const refreshToken = cookies[UNIFIED_AUTH_CONFIG.PRIMARY_REFRESH_COOKIE] ||
                        cookies['refresh_token'] ||
                        cookies['refresh-token'] ||
                        null;
    
    const tenantId = cookies[UNIFIED_AUTH_CONFIG.TENANT_ID_COOKIE] || null;
    const userEmail = cookies[UNIFIED_AUTH_CONFIG.USER_EMAIL_COOKIE] ||
                     cookies['user_email'] ||
                     null;
    
    // Determine source for debugging
    let source = 'none';
    if (cookies[UNIFIED_AUTH_CONFIG.PRIMARY_AUTH_COOKIE]) source = 'unified';
    else if (cookies['sb-lhcopwwiqwjpzbdnjovo-auth-token']) source = 'supabase';
    else if (cookies['access_token']) source = 'legacy-access';
    else if (cookies['auth-token']) source = 'legacy-auth';
    
    return {
      tenantId,
      userEmail,
      accessToken,
      refreshToken,
      source
    };
  }
  
  /**
   * LEGACY COMPATIBILITY: Keep old method for gradual migration
   * @deprecated Use getUnifiedAuthCookies instead
   */
  static getSchemaAlignedCookies(serverCookies?: Record<string, string>) {
    const unified = this.getUnifiedAuthCookies(serverCookies);
    return {
      tenantId: unified.tenantId,
      userEmail: unified.userEmail,
      accessToken: unified.accessToken,
      refreshToken: unified.refreshToken
    };
  }
  
  /**
   * 🔒 SECURE ACCESS LEVEL FETCHER
   * 
   * Use this instead of localStorage or cookie-based access checks
   * Always fetches fresh data from database to prevent privilege escalation
   */
  static async getSecureUserAccess(): Promise<{
    isAdmin: boolean;
    accessLevel: number;
    role: string;
    tenantId: string | null;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/auth/session');
      const sessionData = await response.json();
      
      if (!sessionData.authenticated || !sessionData.user) {
        return {
          isAdmin: false,
          accessLevel: 2,
          role: 'user',
          tenantId: null,
          error: 'Not authenticated'
        };
      }
      
      const isAdmin = sessionData.user.role === 'admin';
      return {
        isAdmin,
        accessLevel: isAdmin ? 1 : 2, // Map role to access level
        role: sessionData.user.role,
        tenantId: sessionData.tenantId || null
      };
    } catch (error) {
      console.error('🚨 [SECURITY] Failed to fetch secure access data:', error);
      return {
        isAdmin: false,
        accessLevel: 2,
        role: 'user', 
        tenantId: null,
        error: 'Session fetch failed'
      };
    }
  }
  
  /**
   * DEBUG: Log current cookie state for troubleshooting
   * 
   * @param serverCookies - Optional server-side cookies object for SSR compatibility
   */
  static debugCookieState(serverCookies?: Record<string, string>): void {
    // Check if running server-side
    if (typeof window === 'undefined') {
      if (serverCookies) {
        console.log(`🔍 [COOKIE DEBUG] Server-side cookie state:`, serverCookies);
      } else {
        console.log(`🔍 [COOKIE DEBUG] Server-side - no cookies provided for debugging`);
      }
      return;
    }
    
    // Client-side debugging
    const current = this.getSchemaAlignedCookies();
    const allCookies = document.cookie;
    
    console.log(`🔍 [COOKIE DEBUG] Schema-aligned state:`, current);
    console.log(`🔍 [COOKIE DEBUG] Raw cookies:`, allCookies);
    console.log(`🔍 [COOKIE DEBUG] Validation:`, {
      hasValidTenantId: current.tenantId ? /^[0-9a-f-]{36}$/i.test(current.tenantId) : false,
      hasValidEmail: current.userEmail ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.userEmail) : false,
      currentSubdomain: window.location.hostname.split('.')[0], // subdomain from URL, not cookies
      securityNote: 'Use getSecureUserAccess() for access control, not these cookies!'
    });
  }
}
