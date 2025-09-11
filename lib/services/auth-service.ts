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

  /**
   * CORE METHOD: Get current auth token
   * Used by: Middleware, API Client, Components
   */
  static async getToken(): Promise<string | null> {
    // 🛡️ CRITICAL FIX: Server-side safety check
    if (typeof window === 'undefined') {
      console.warn('🔐 [AUTH-SERVICE] Server-side call detected - returning null');
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
        console.warn('🔐 [AUTH-SERVICE] Session error:', error.message);
        this.clearTokenCache();
        return null;
      }

      if (!session?.access_token) {
        console.log('🔐 [AUTH-SERVICE] No active session');
        this.clearTokenCache();
        return null;
      }

      // Cache token with expiry
      this.tokenCache = session.access_token;
      this.tokenExpiry = (session.expires_at || 0) * 1000 - 60000; // 1 minute buffer
      
      console.log('✅ [AUTH-SERVICE] Token retrieved successfully');
      return session.access_token;

    } catch (error) {
      console.error('❌ [AUTH-SERVICE] Token retrieval failed:', error);
      this.clearTokenCache();
      return null;
    }
  }

  /**
   * CORE METHOD: Check if user is authenticated
   * Used by: Components, Route Guards
   */
  static async isAuthenticated(): Promise<boolean> {
    // 🛡️ Server-side safety check
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
    // 🛡️ Server-side safety check
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

    } catch (error) {
      console.error('❌ [AUTH-SERVICE] Get user failed:', error);
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
        console.error('❌ [AUTH-SERVICE] Set session failed:', error);
        return false;
      }

      // Clear cache to force refresh
      this.clearTokenCache();
      
      console.log('✅ [AUTH-SERVICE] Session set successfully');
      return true;

    } catch (error) {
      console.error('❌ [AUTH-SERVICE] Set session error:', error);
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
      console.log('✅ [AUTH-SERVICE] Auth cleared successfully');
    } catch (error) {
      console.error('❌ [AUTH-SERVICE] Clear auth error:', error);
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

    } catch (error) {
      console.error('❌ [AUTH-SERVICE] Token validation error:', error);
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
      console.warn('🔐 [AUTH-SERVICE] Cookie parsing error:', error);
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
      console.log(`🔐 [AUTH-SERVICE] Auth state change: ${event}`);
      
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        this.clearTokenCache();
      }
      
      if (session?.access_token) {
        this.tokenCache = session.access_token;
        this.tokenExpiry = (session.expires_at || 0) * 1000 - 60000;
      }
    });

    this.isInitialized = true;
    console.log('✅ [AUTH-SERVICE] Initialized successfully');
  }
}

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  AuthService.initialize();
}
