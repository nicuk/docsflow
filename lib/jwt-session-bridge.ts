/**
 * JWT SESSION BRIDGE
 * Immediately captures and caches Supabase tokens when session changes occur
 * Prevents timing issues between authentication and API calls
 */

import { createClient } from '@/lib/supabase-browser';

class JWTSessionBridge {
  private static instance: JWTSessionBridge;
  private supabase: any;
  private initialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.supabase = createClient();
      this.initializeSessionWatcher();
    }
  }

  static getInstance(): JWTSessionBridge {
    if (!JWTSessionBridge.instance) {
      JWTSessionBridge.instance = new JWTSessionBridge();
    }
    return JWTSessionBridge.instance;
  }

  private initializeSessionWatcher() {
    if (this.initialized || typeof window === 'undefined') return;

    // Listen for auth state changes
    this.supabase.auth.onAuthStateChange((event: string, session: any) => {
      console.log(`🔍 [JWT-BRIDGE] Auth state change: ${event}`);
      
      if (session?.access_token) {
        // Immediately cache token when session is available
        localStorage.setItem('jwt_access_token', session.access_token);
        localStorage.setItem('jwt_expires_at', session.expires_at?.toString() || '');
        console.log('🔍 [JWT-BRIDGE] Token immediately cached on auth change');
        
        // Also cache tenant context if available in user metadata
        if (session.user?.user_metadata) {
          const metadata = session.user.user_metadata;
          if (metadata.tenant_id || metadata.tenantId) {
            const tenantContext = {
              tenantId: metadata.tenant_id || metadata.tenantId,
              subdomain: metadata.subdomain,
              timestamp: Date.now()
            };
            localStorage.setItem('tenant_context', JSON.stringify(tenantContext));
            console.log('🔍 [JWT-BRIDGE] Tenant context cached from user metadata');
          }
        }
      } else if (event === 'SIGNED_OUT') {
        // Clean up cached tokens on logout
        localStorage.removeItem('jwt_access_token');
        localStorage.removeItem('jwt_expires_at');
        localStorage.removeItem('tenant_context');
        console.log('🔍 [JWT-BRIDGE] Tokens cleared on logout');
      }
    });

    this.initialized = true;
    console.log('🔍 [JWT-BRIDGE] Session watcher initialized');
  }

  // Force refresh token cache
  async refreshTokenCache(): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (!error && session?.access_token) {
        localStorage.setItem('jwt_access_token', session.access_token);
        localStorage.setItem('jwt_expires_at', session.expires_at?.toString() || '');
        console.log('🔍 [JWT-BRIDGE] Token cache refreshed manually');
        return true;
      }
    } catch (error) {
      console.error('🔍 [JWT-BRIDGE] Failed to refresh token cache:', error);
    }
    
    return false;
  }

  // Get cached token with validation
  getCachedToken(): string | null {
    if (typeof window === 'undefined') return null;

    const token = localStorage.getItem('jwt_access_token');
    const expiresAt = localStorage.getItem('jwt_expires_at');

    if (token && expiresAt) {
      const expires = new Date(parseInt(expiresAt) * 1000);
      if (expires > new Date()) {
        return token;
      } else {
        // Clean expired tokens
        localStorage.removeItem('jwt_access_token');
        localStorage.removeItem('jwt_expires_at');
        console.log('🔍 [JWT-BRIDGE] Expired token removed from cache');
      }
    }

    return null;
  }
}

// Initialize the bridge automatically
export const jwtBridge = JWTSessionBridge.getInstance();

// Export for manual usage
export { JWTSessionBridge };
