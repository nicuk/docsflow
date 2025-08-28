/**
 * SCHEMA-ALIGNED COOKIE MANAGEMENT
 * 
 * This utility ensures cookies align with database schema and actual usage:
 * - tenants.id (UUID) → tenant-id cookie (read by middleware)
 * - users.email (text) → user-email cookie (read by middleware)
 * - Supabase session tokens → access_token/refresh_token
 * 
 * NOTE: tenant subdomain is handled via x-tenant-subdomain HEADER (not cookie)
 * set by middleware for API consumption
 */

interface TenantContext {
  tenantId: string;      // UUID from tenants.id - stored in tenant-id cookie
  subdomain: string;     // text from tenants.subdomain - NOT stored as cookie (header only)
  userEmail: string;     // text from users.email - stored in user-email cookie
}

interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

/**
 * CRITICAL: This list must include ALL possible cookie variants to prevent contamination
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
  'refreshToken'
];

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
   * SCHEMA-ALIGNED COOKIE SETTING: Sets cookies that exactly match database schema
   */
  static setSchemaAlignedCookies(context: TenantContext, tokens: AuthTokens): void {
    if (!this.validateTenantContext(context)) {
      throw new Error('Schema validation failed - refusing to set invalid cookies');
    }
    
    // First, completely clear any existing auth cookies
    this.clearAllAuthCookies();
    
    const cookieOptions = 'path=/; domain=.docsflow.app; secure; samesite=lax; max-age=86400';
    const tokenOptions = 'path=/; domain=.docsflow.app; secure; samesite=lax; max-age=3600';
    
    // Set SCHEMA-ALIGNED cookies (only those actually used by middleware)
    document.cookie = `tenant-id=${context.tenantId}; ${cookieOptions}`;
    document.cookie = `user-email=${context.userEmail}; ${cookieOptions}`;  // Use dash format to match existing cookies
    // NOTE: subdomain is NOT stored as cookie - middleware sets it as x-tenant-subdomain header
    
    // Set authentication tokens
    document.cookie = `access_token=${tokens.accessToken}; ${tokenOptions}`;
    if (tokens.refreshToken) {
      document.cookie = `refresh_token=${tokens.refreshToken}; ${tokenOptions}`;
    }
    
    // ALSO set Supabase-specific cookies for compatibility
    document.cookie = `sb-lhcopwwiqwjpzbdnjovo-auth-token=${tokens.accessToken}; ${tokenOptions}`;
    
    console.log(`✅ [SCHEMA] Set schema-aligned cookies:`, {
      tenantId: context.tenantId.substring(0, 8) + '...',
      subdomain: context.subdomain,
      email: context.userEmail,
      hasTokens: !!tokens.accessToken
    });
  }
  
  /**
   * SCHEMA-ALIGNED COOKIE READING: Reads cookies with fallback to variants
   */
  static getSchemaAlignedCookies(): {
    tenantId: string | null;
    userEmail: string | null; 
    accessToken: string | null;
    refreshToken: string | null;
  } {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    return {
      tenantId: cookies['tenant-id'] || null,
      userEmail: cookies['user_email'] || cookies['user-email'] || null,
      accessToken: cookies['access_token'] || cookies['auth-token'] || null,
      refreshToken: cookies['refresh_token'] || cookies['refresh-token'] || null
      // NOTE: subdomain not returned - it's available via window.location.hostname or headers
    };
  }
  
  /**
   * DEBUG: Log current cookie state for troubleshooting
   */
  static debugCookieState(): void {
    const current = this.getSchemaAlignedCookies();
    const allCookies = document.cookie;
    
    console.log(`🔍 [COOKIE DEBUG] Schema-aligned state:`, current);
    console.log(`🔍 [COOKIE DEBUG] Raw cookies:`, allCookies);
    console.log(`🔍 [COOKIE DEBUG] Validation:`, {
      hasValidTenantId: current.tenantId ? /^[0-9a-f-]{36}$/i.test(current.tenantId) : false,
      hasValidEmail: current.userEmail ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.userEmail) : false,
      currentSubdomain: window.location.hostname.split('.')[0] // subdomain from URL, not cookies
    });
  }
}
