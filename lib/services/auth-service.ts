/**
 * UNIFIED AUTH SERVICE
 * Single source of truth for ALL authentication operations
 * 
 * REPLACES:
 * - JWT Session Bridge
 * - Multi-Tenant Cookie Manager  
 * - API Client auth logic
 * - Middleware auth extraction
 * - Multiple Supabase client instances
 */

import { createClient } from '@/lib/supabase-browser';
import { SafeBase64Decoder } from './safe-base64-decoder';
import type { 
  AuthToken, 
  AuthUser, 
  AuthSession, 
  AuthValidationResult 
} from '@/lib/types/auth.types';

export class AuthService {
  private static supabase = createClient();
  private static tokenCache: string | null = null;
  private static tokenExpiry: number = 0;
  private static isInitialized = false;
  private static timeoutWarningShown = false;
  private static sessionCheckInterval: NodeJS.Timeout | null = null;

  /**
   * CORE METHOD: Get current auth token
   * Used by: Middleware, API Client, Components
   */
  static async getToken(): Promise<string | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      // Check cache first (performance optimization)
      if (this.tokenCache && Date.now() < this.tokenExpiry) {
        return this.tokenCache;
      }

      // Get fresh session from Supabase
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error) {
        this.clearTokenCache();
        return null;
      }

      if (!session?.access_token) {
        
        // Try to refresh the session
        try {
          const { data: refreshData, error: refreshError } = await this.supabase.auth.refreshSession();
          
          if (refreshError || !refreshData.session?.access_token) {
            this.clearTokenCache();
            return null;
          }
          
          
          
          // Cache refreshed token
          this.tokenCache = refreshData.session.access_token;
          this.tokenExpiry = (refreshData.session.expires_at || 0) * 1000 - 60000;
          
          return refreshData.session.access_token;
          
        } catch (refreshError) {
          this.clearTokenCache();
          return null;
        }
      }

      // Cache token with expiry
      this.tokenCache = session.access_token;
      this.tokenExpiry = (session.expires_at || 0) * 1000 - 60000; // 1 minute buffer
      
      return session.access_token;

    } catch (error) {
      this.clearTokenCache();
      return null;
    }
  }

  /**
   * CORE METHOD: Check if user is authenticated
   * Used by: Components, Route Guards
   */
  static async isAuthenticated(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }
    
    const token = await this.getToken();
    return token !== null;
  }

  /**
   * CORE METHOD: Get current user info
   * Used by: Components, Profile displays
   */
  static async getCurrentUser(): Promise<AuthUser | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error || !user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User'
      };

    } catch {
      return null;
    }
  }

  /**
   * CORE METHOD: Set auth session (login/register)
   * Used by: Login API, Register API
   */
  static async setSession(accessToken: string, refreshToken?: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || ''
      });

      if (error) {
        return false;
      }

      this.clearTokenCache();
      return true;

    } catch {
      return false;
    }
  }

  /**
   * CORE METHOD: Clear auth (logout)
   * Used by: Logout components
   */
  static async clearAuth(): Promise<void> {
    try {
      await this.supabase.auth.signOut();
      this.clearTokenCache();
    } catch {
      // Sign-out cleanup failed
    }
  }

  /**
   * VALIDATION METHOD: Validate token and extract user info
   * Used by: API routes, middleware
   */
  static async validateToken(token: string): Promise<AuthValidationResult> {
    try {
      if (!token) {
        return {
          isValid: false,
          error: 'No token provided',
          statusCode: 401
        };
      }

      // Validate token with Supabase
      const { data: { user }, error } = await this.supabase.auth.getUser(token);
      
      if (error || !user) {
        return {
          isValid: false,
          error: 'Invalid token',
          statusCode: 401
        };
      }

      return {
        isValid: true,
        user: {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User'
        },
        token
      };

    } catch {
      return {
        isValid: false,
        error: 'Token validation failed',
        statusCode: 500
      };
    }
  }

  /**
   * LEGACY COMPATIBILITY: Parse cookies (for migration period)
   * Used during migration from existing cookie systems
   */
  static parseAuthFromCookies(cookieString: string): string | null {
    if (typeof window === 'undefined' || !cookieString) {
      return null;
    }

    try {
      const cookies = cookieString.split(';').map(c => c.trim());
      
      // Try Supabase auth cookie first
      const supabaseCookie = cookies.find(c => 
        c.startsWith('sb-') && c.includes('auth-token')
      );
      
      if (supabaseCookie) {
        const value = supabaseCookie.split('=')[1];
        if (value) {
          // Use safe decoder instead of direct atob()
          const accessToken = SafeBase64Decoder.parseSupabaseCookie(value);
          if (accessToken) {
            return accessToken;
          }
        }
      }

      // Fallback to other auth cookies
      const authCookie = cookies.find(c => 
        c.startsWith('docsflow_auth_token=') || 
        c.startsWith('access_token=')
      );
      
      if (authCookie) {
        return authCookie.split('=')[1] || null;
      }

      return null;

    } catch (error) {
      return null;
    }
  }

  /**
   * PRIVATE: Cache management
   */
  private static clearTokenCache(): void {
    this.tokenCache = null;
    this.tokenExpiry = 0;
  }

  /**
   * INITIALIZATION: Set up auth state listener
   */
  static initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    this.supabase.auth.onAuthStateChange((event, session) => {
      
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        this.clearTokenCache();
        
      }
      
      if (session?.access_token) {
        this.tokenCache = session.access_token;
        this.tokenExpiry = (session.expires_at || 0) * 1000 - 60000;
        
      }
    });
    

    // Setup session timeout monitoring
    this.setupSessionTimeoutMonitoring();

    this.isInitialized = true;
  }


  /**
   * Setup session timeout monitoring and warnings
   */
  private static setupSessionTimeoutMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Check session every 30 seconds
    this.sessionCheckInterval = setInterval(async () => {
      const timeToExpiry = this.tokenExpiry - Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      const oneMinute = 60 * 1000;

      // Show warning 5 minutes before expiry
      if (timeToExpiry > 0 && timeToExpiry <= fiveMinutes && !this.timeoutWarningShown) {
        this.timeoutWarningShown = true;
        this.showSessionTimeoutWarning(Math.floor(timeToExpiry / 1000));
      }

      if (timeToExpiry > 0 && timeToExpiry <= oneMinute) {
        try {
          await this.refreshSession();
          this.timeoutWarningShown = false; // Reset warning flag
        } catch (error) {
          this.handleSessionExpired();
        }
      }

      // Handle expired session
      if (timeToExpiry <= 0 && this.tokenCache) {
        this.handleSessionExpired();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Show session timeout warning to user
   */
  private static showSessionTimeoutWarning(secondsRemaining: number): void {
    const minutes = Math.floor(secondsRemaining / 60);
    const message = `Your session will expire in ${minutes} minute${minutes !== 1 ? 's' : ''}. Please save your work.`;
    
    // Create a non-intrusive notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Session Expiring', {
        body: message,
        icon: '/favicon.ico'
      });
    }

  }

  /**
   * Handle session expiration
   */
  private static handleSessionExpired(): void {
    this.clearTokenCache();
    this.timeoutWarningShown = false;


    // Only redirect if not already on login page
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login?reason=session-expired';
    }
  }

  /**
   * Manual session refresh method
   */
  private static async refreshSession(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();
      
      if (error || !data.session?.access_token) {
        throw new Error(`Session refresh failed: ${error?.message || 'No session returned'}`);
      }

      this.tokenCache = data.session.access_token;
      this.tokenExpiry = (data.session.expires_at || 0) * 1000 - 60000;

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup method for proper resource management
   */
  static destroy(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
    this.clearTokenCache();
    this.isInitialized = false;
  }
}

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  AuthService.initialize();
}
