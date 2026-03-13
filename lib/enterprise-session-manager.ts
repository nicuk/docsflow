/**
 * ENTERPRISE SESSION MANAGER
 * Handles cross-subdomain session management for multi-tenant users
 * Eliminates localStorage dependency and cache contamination
 */

export interface TenantSession {
  tenantId: string;        // UUID
  subdomain: string;       // subdomain string
  userEmail: string;
  lastAccessed: number;
}

export interface CrossSubdomainSession {
  userId: string;
  userEmail: string;
  activeTenants: TenantSession[];
  currentTenant?: TenantSession;
}

export class EnterpriseSessionManager {
  private static readonly SESSION_COOKIE = 'enterprise-session';
  private static readonly TENANT_CONTEXT_COOKIE = 'tenant-context';
  
  /**
   * ENTERPRISE: Set cross-subdomain session for multi-tenant user
   */
  static setUserSession(session: CrossSubdomainSession): void {
    try {
      // Filter out empty subdomains to prevent cookie corruption
      const validTenants = session.activeTenants.filter(tenant => 
        tenant.subdomain && tenant.subdomain.length > 0 && tenant.subdomain !== ''
      );
      
      if (validTenants.length === 0) {
        return;
      }
      
      const sessionData = JSON.stringify({
        userId: session.userId,
        userEmail: session.userEmail,
        activeTenants: validTenants,
        timestamp: Date.now()
      });
      
      // Set session cookie with proper domain for cross-subdomain access
      document.cookie = `${this.SESSION_COOKIE}=${encodeURIComponent(sessionData)}; path=/; domain=.docsflow.app; secure; samesite=lax; max-age=86400`;
    } catch {
      // Session cookie write failed
    }
  }
  
  /**
   * ENTERPRISE: Set current tenant context (separate from user session)
   */
  static setTenantContext(tenantId: string, subdomain: string): void {
    try {
      const tenantData = JSON.stringify({
        tenantId,     // UUID
        subdomain,    // subdomain string
        timestamp: Date.now()
      });
      
      // Set tenant context cookie
      document.cookie = `${this.TENANT_CONTEXT_COOKIE}=${encodeURIComponent(tenantData)}; path=/; domain=.docsflow.app; secure; samesite=lax; max-age=86400`;
    } catch {
      // Tenant context cookie write failed
    }
  }
  
  /**
   * ENTERPRISE: Get current user session
   */
  static getUserSession(): CrossSubdomainSession | null {
    try {
      const sessionCookie = this.getCookie(this.SESSION_COOKIE);
      if (!sessionCookie) {
        return null;
      }
      
      const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
      
      // Validate session structure
      if (!sessionData.userId || !sessionData.userEmail || !Array.isArray(sessionData.activeTenants)) {
        this.clearSession();
        return null;
      }
      
      return {
        userId: sessionData.userId,
        userEmail: sessionData.userEmail,
        activeTenants: sessionData.activeTenants
      };
    } catch {
      return null;
    }
  }
  
  /**
   * ENTERPRISE: Get current tenant context
   */
  static getTenantContext(): TenantSession | null {
    try {
      const tenantCookie = this.getCookie(this.TENANT_CONTEXT_COOKIE);
      if (!tenantCookie) {
        return null;
      }
      
      const tenantData = JSON.parse(decodeURIComponent(tenantCookie));
      
      // GRACEFUL SESSION VALIDATION: Return null for incomplete context instead of nuclear clear
      if (!tenantData.tenantId || !tenantData.subdomain) {
        return null; // Return null instead of clearing everything
      }
      
      return {
        tenantId: tenantData.tenantId,
        subdomain: tenantData.subdomain,
        userEmail: '', // Will be filled from user session
        lastAccessed: tenantData.timestamp || Date.now()
      };
    } catch {
      return null;
    }
  }
  
  /**
   * ENTERPRISE: Check if user has access to specific tenant
   */
  static hasAccessToTenant(tenantId: string): boolean {
    const session = this.getUserSession();
    if (!session) return false;
    
    return session.activeTenants.some(tenant => tenant.tenantId === tenantId);
  }
  
  /**
   * ENTERPRISE: Clear all session data
   */
  static clearSession(): void {
    document.cookie = `${this.SESSION_COOKIE}=; path=/; domain=.docsflow.app; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${this.TENANT_CONTEXT_COOKIE}=; path=/; domain=.docsflow.app; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
  
  /**
   * ENTERPRISE: Clear only tenant context (for tenant switching)
   */
  static clearTenantContext(): void {
    document.cookie = `${this.TENANT_CONTEXT_COOKIE}=; path=/; domain=.docsflow.app; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
  
  /**
   * Utility: Get cookie value
   */
  private static getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }
}
