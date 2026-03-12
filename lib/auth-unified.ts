/**
 * UNIFIED ENTERPRISE AUTH SERVICE
 * 
 * REPLACES:
 * - lib/services/auth-service.ts (over-engineered)
 * - lib/session-sync.ts (unnecessary)
 * - Multiple competing auth systems
 * 
 * PRESERVES:
 * - Multi-tenant functionality
 * - Cross-subdomain sessions
 * - Access level enforcement
 * - Enterprise security
 */

import { createClient } from '@/lib/supabase-browser';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  tenant_id: string;
  role: 'admin' | 'user' | 'viewer';
  access_level: number;
  tenant?: {
    id: string;
    subdomain: string;
    name: string;
    industry: string;
  };
}

export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * ENTERPRISE-GRADE UNIFIED AUTH SERVICE
 * Single source of truth for all authentication
 */
export class UnifiedAuth {
  private static supabase = createClient();
  private static currentState: AuthState = {
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false
  };
  private static listeners: Set<(state: AuthState) => void> = new Set();

  /**
   * Initialize auth service (call once on app start)
   */
  static async initialize(): Promise<AuthState> {
    try {
      // Get current session from Supabase
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error) {
        console.warn('🔐 [UNIFIED-AUTH] Session error:', error.message);
        this.updateState({ user: null, session: null, isLoading: false, isAuthenticated: false });
        return this.currentState;
      }

      if (session) {
        const user = await this.fetchUserProfile(session.user);
        this.updateState({
          user,
          session,
          isLoading: false,
          isAuthenticated: !!user
        });
      } else {
        this.updateState({ user: null, session: null, isLoading: false, isAuthenticated: false });
      }

      // Set up auth state listener (Supabase handles all session management)
      this.supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`🔐 [UNIFIED-AUTH] Auth state change: ${event}`);
        
        if (session) {
          const user = await this.fetchUserProfile(session.user);
          this.updateState({
            user,
            session,
            isLoading: false,
            isAuthenticated: !!user
          });
        } else {
          this.updateState({ user: null, session: null, isLoading: false, isAuthenticated: false });
        }
      });

      return this.currentState;
    } catch (error) {
      console.error('❌ [UNIFIED-AUTH] Initialization failed:', error);
      this.updateState({ user: null, session: null, isLoading: false, isAuthenticated: false });
      return this.currentState;
    }
  }

  /**
   * Get current auth state
   */
  static getState(): AuthState {
    return this.currentState;
  }

  /**
   * Get current auth token
   */
  static async getToken(): Promise<string | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session?.access_token || null;
  }

  /**
   * Login with email/password (multi-tenant aware)
   */
  static async login(email: string, password: string, rememberMe = false): Promise<{
    success: boolean;
    user?: AuthUser;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('🔐 [UNIFIED-AUTH] Login error:', error.message);
        return { success: false, error: error.message };
      }

      if (data.session) {
        const user = await this.fetchUserProfile(data.user);
        
        // Set remember me preference (server will handle duration)
        if (rememberMe && typeof document !== 'undefined') {
          document.cookie = `remember-me=true; path=/; domain=.docsflow.app; max-age=${60 * 60 * 24 * 30}; secure; samesite=lax`;
        }

        return { success: true, user };
      }

      return { success: false, error: 'No session returned' };
    } catch (error: any) {
      console.error('❌ [UNIFIED-AUTH] Login failed:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  }

  /**
   * Logout
   */
  static async logout(): Promise<void> {
    try {
      await this.supabase.auth.signOut();
      
      // Clear remember me cookie
      if (typeof document !== 'undefined') {
        document.cookie = 'remember-me=; path=/; domain=.docsflow.app; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
      
      console.log('✅ [UNIFIED-AUTH] Logout successful');
    } catch (error) {
      console.error('❌ [UNIFIED-AUTH] Logout failed:', error);
    }
  }

  /**
   * Subscribe to auth state changes
   */
  static subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Fetch user profile with tenant information
   */
  private static async fetchUserProfile(user: User): Promise<AuthUser | null> {
    try {
      const { data: userProfile, error } = await this.supabase
        .from('users')
        .select(`
          id,
          email,
          name,
          role,
          access_level,
          tenant_id,
          tenants (
            id,
            subdomain,
            name,
            industry
          )
        `)
        .eq('id', user.id)
        .single();

      if (error || !userProfile) {
        console.error('❌ [UNIFIED-AUTH] User profile fetch failed:', error);
        return null;
      }

      return {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        tenant_id: userProfile.tenant_id,
        role: userProfile.role,
        access_level: userProfile.access_level,
        tenant: userProfile.tenants ? {
          id: (userProfile.tenants as any).id,
          subdomain: (userProfile.tenants as any).subdomain,
          name: (userProfile.tenants as any).name,
          industry: (userProfile.tenants as any).industry
        } : undefined
      };
    } catch (error) {
      console.error('❌ [UNIFIED-AUTH] Profile fetch error:', error);
      return null;
    }
  }

  /**
   * Update internal state and notify listeners
   */
  private static updateState(newState: Partial<AuthState>): void {
    this.currentState = { ...this.currentState, ...newState };
    
    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.currentState);
      } catch (error) {
        console.error('❌ [UNIFIED-AUTH] Listener error:', error);
      }
    });
  }

  /**
   * Check if user has required access level
   */
  static hasAccess(requiredLevel: number): boolean {
    const { user } = this.currentState;
    return user ? user.access_level <= requiredLevel : false;
  }

  /**
   * Check if user has required role
   */
  static hasRole(requiredRole: 'admin' | 'user' | 'viewer'): boolean {
    const { user } = this.currentState;
    if (!user) return false;
    
    const roleHierarchy = { admin: 3, user: 2, viewer: 1 };
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }
}

// Auto-initialize when imported (client-side only)
if (typeof window !== 'undefined') {
  UnifiedAuth.initialize().catch(console.error);
}




