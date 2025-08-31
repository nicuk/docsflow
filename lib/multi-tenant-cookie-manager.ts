/**
 * ENTERPRISE MULTI-TENANT COOKIE MANAGER
 * 
 * Handles multiple tenant contexts per user without destroying access to other tenants.
 * Uses namespaced cookie architecture for enterprise-grade multi-tenant support.
 */

interface TenantContext {
  tenantId: string;      // UUID from tenants.id
  subdomain: string;     // text from tenants.subdomain
  userEmail: string;     // text from users.email
}

interface TenantContexts {
  [subdomain: string]: string; // subdomain -> tenant UUID mapping
}

interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export class MultiTenantCookieManager {
  
  /**
   * SCHEMA VALIDATION: Ensures data matches database constraints
   */
  private static validateTenantContext(context: TenantContext): boolean {
    // Validate tenant ID is UUID format (matches tenants.id)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(context.tenantId)) {
      console.error(`❌ [MULTI-TENANT] Invalid tenant ID format: ${context.tenantId}`);
      return false;
    }
    
    // Validate email format (matches users.email)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(context.userEmail)) {
      console.error(`❌ [MULTI-TENANT] Invalid email format: ${context.userEmail}`);
      return false;
    }
    
    // Validate subdomain format (matches tenants.subdomain - no special chars)
    const subdomainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
    if (!subdomainRegex.test(context.subdomain)) {
      console.error(`❌ [MULTI-TENANT] Invalid subdomain format: ${context.subdomain}`);
      return false;
    }
    
    return true;
  }
  
  /**
   * GET CURRENT TENANT CONTEXTS: Reads existing multi-tenant cookie structure
   */
  static getCurrentTenantContexts(): TenantContexts {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    try {
      const contexts = cookies['tenant-contexts'];
      return contexts ? JSON.parse(contexts) : {};
    } catch (e) {
      console.warn('🔄 [MULTI-TENANT] Invalid tenant-contexts cookie, returning empty');
      return {};
    }
  }
  
  /**
   * ADD TENANT CONTEXT: Safely adds new tenant without destroying existing ones
   * ENHANCED: Now compatible with existing validation systems
   */
  static addTenantContext(context: TenantContext, tokens: AuthTokens): void {
    if (!this.validateTenantContext(context)) {
      throw new Error('Schema validation failed - refusing to set invalid tenant context');
    }
    
    // COMPATIBILITY: Clear any conflicting legacy cookies first
    this.clearLegacyCookies();
    
    // Get existing tenant contexts
    const existingContexts = this.getCurrentTenantContexts();
    
    // Add new tenant context
    existingContexts[context.subdomain] = context.tenantId;
    
    const cookieOptions = 'path=/; domain=.docsflow.app; secure; samesite=lax; max-age=604800'; // 7 days
    const tokenOptions = 'path=/; domain=.docsflow.app; secure; samesite=lax; max-age=3600';    // 1 hour
    
    // Set MULTI-TENANT cookies
    document.cookie = `tenant-contexts=${JSON.stringify(existingContexts)}; ${cookieOptions}`;
    document.cookie = `current-tenant=${context.subdomain}; ${cookieOptions}`;
    document.cookie = `user-email=${context.userEmail}; ${cookieOptions}`;
    
    // COMPATIBILITY: Also set validation-compatible cookies
    document.cookie = `tenant-id=${context.tenantId}; ${cookieOptions}`;
    
    // Set authentication tokens
    document.cookie = `access_token=${tokens.accessToken}; ${tokenOptions}`;
    if (tokens.refreshToken) {
      document.cookie = `refresh_token=${tokens.refreshToken}; ${tokenOptions}`;
    }
    
    // UNIFIED AUTH: Set unified auth token for validation compatibility
    document.cookie = `docsflow_auth_token=${tokens.accessToken}; ${tokenOptions}`;
    if (tokens.refreshToken) {
      document.cookie = `docsflow_refresh_token=${tokens.refreshToken}; ${tokenOptions}`;
    }
    
    // ALSO set Supabase-specific cookies for compatibility
    document.cookie = `sb-lhcopwwiqwjpzbdnjovo-auth-token=${tokens.accessToken}; ${tokenOptions}`;
    
    console.log(`✅ [MULTI-TENANT] Added tenant context:`, {
      subdomain: context.subdomain,
      tenantId: context.tenantId.substring(0, 8) + '...',
      totalTenants: Object.keys(existingContexts).length,
      allSubdomains: Object.keys(existingContexts)
    });
  }
  
  /**
   * SWITCH TENANT: Changes current tenant without losing access to others
   */
  static switchToTenant(subdomain: string): boolean {
    const contexts = this.getCurrentTenantContexts();
    
    if (!contexts[subdomain]) {
      console.error(`❌ [MULTI-TENANT] Cannot switch to unknown tenant: ${subdomain}`);
      return false;
    }
    
    // Simply update current-tenant cookie
    const cookieOptions = 'path=/; domain=.docsflow.app; secure; samesite=lax; max-age=604800';
    document.cookie = `current-tenant=${subdomain}; ${cookieOptions}`;
    
    console.log(`🔄 [MULTI-TENANT] Switched to tenant: ${subdomain}`);
    return true;
  }
  
  /**
   * GET USER'S TENANT LIST: Returns all tenants user has access to
   */
  static getUserTenantList(): string[] {
    const contexts = this.getCurrentTenantContexts();
    return Object.keys(contexts);
  }
  
  /**
   * LEGACY MIGRATION: Migrates old single-tenant cookies to multi-tenant structure
   */
  static migrateLegacyCookies(): void {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    const legacyTenantId = cookies['tenant-id'];
    const currentSubdomain = window.location.hostname.split('.')[0];
    
    if (legacyTenantId && currentSubdomain && currentSubdomain !== 'www' && currentSubdomain !== 'docsflow') {
      console.log(`🔄 [MIGRATION] Migrating legacy tenant-id to multi-tenant structure`);
      
      const existingContexts = this.getCurrentTenantContexts();
      if (!existingContexts[currentSubdomain]) {
        existingContexts[currentSubdomain] = legacyTenantId;
        
        const cookieOptions = 'path=/; domain=.docsflow.app; secure; samesite=lax; max-age=604800';
        document.cookie = `tenant-contexts=${JSON.stringify(existingContexts)}; ${cookieOptions}`;
        document.cookie = `current-tenant=${currentSubdomain}; ${cookieOptions}`;
        
        console.log(`✅ [MIGRATION] Successfully migrated legacy cookies to multi-tenant`);
      }
    }
  }
  
  /**
   * LEGACY CLEANUP: Remove conflicting cookie formats from other systems
   */
  static clearLegacyCookies(): void {
    const legacyCookies = [
      'user_email', // Old format (underscore)
      'auth-token', 'refresh-token', // Old format (hyphen)
    ];
    
    const expireDate = 'Thu, 01 Jan 1970 00:00:00 GMT';
    legacyCookies.forEach(cookieName => {
      document.cookie = `${cookieName}=; path=/; domain=.docsflow.app; expires=${expireDate}`;
    });
  }
  
  /**
   * SAFE CLEANUP: Only clears auth tokens, preserves tenant contexts
   */
  static clearAuthTokensOnly(): void {
    const authCookies = ['access_token', 'refresh_token', 'sb-lhcopwwiqwjpzbdnjovo-auth-token'];
    const expireDate = 'Thu, 01 Jan 1970 00:00:00 GMT';
    
    authCookies.forEach(cookieName => {
      document.cookie = `${cookieName}=; path=/; domain=.docsflow.app; expires=${expireDate}`;
    });
    
    console.log(`🧹 [MULTI-TENANT] Cleared auth tokens only (preserved tenant contexts)`);
  }
  
  /**
   * DEBUG: Log current multi-tenant state
   */
  static debugMultiTenantState(): void {
    const contexts = this.getCurrentTenantContexts();
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    console.log(`🔍 [MULTI-TENANT DEBUG] Current state:`, {
      tenantContexts: contexts,
      currentTenant: cookies['current-tenant'],
      totalTenants: Object.keys(contexts).length,
      hasAuthToken: !!cookies['access_token'],
      userEmail: cookies['user_email']
    });
  }
}
