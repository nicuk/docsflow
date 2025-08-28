/**
 * SCHEMA-ALIGNED COOKIE MANAGEMENT
 * 
 * This utility ensures all cookies follow the exact database schema:
 * - tenants.id (UUID) → tenant-id cookie
 * - users.email (text) → user_email cookie  
 * - tenants.subdomain (text) → tenant-subdomain cookie
 * - Supabase session tokens → access_token/refresh_token
 */

interface TenantContext {
  tenantId: string;      // UUID from tenants.id
  subdomain: string;     // text from tenants.subdomain  
  userEmail: string;     // text from users.email
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
  'tenant-subdomain',
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
    
    // Set SCHEMA-ALIGNED cookies (exact database field names)
    document.cookie = `tenant-id=${context.tenantId}; ${cookieOptions}`;
    document.cookie = `user_email=${context.userEmail}; ${cookieOptions}`;
    document.cookie = `tenant-subdomain=${context.subdomain}; ${cookieOptions}`;
    
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
    subdomain: string | null;
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
      subdomain: cookies['tenant-subdomain'] || null,
      accessToken: cookies['access_token'] || cookies['auth-token'] || null,
      refreshToken: cookies['refresh_token'] || cookies['refresh-token'] || null
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
      hasValidSubdomain: current.subdomain ? /^[a-zA-Z0-9-]+$/.test(current.subdomain) : false
    });
  }
}
