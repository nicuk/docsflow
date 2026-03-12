/**
 * SIMPLIFIED ENTERPRISE AUTH HOOK
 * 
 * Replaces complex auth hooks with simple, enterprise-grade patterns
 * Preserves multi-tenant functionality while simplifying session management
 */

import { useState, useEffect } from 'react';
import { UnifiedAuth, type AuthState, type AuthUser } from '@/lib/auth-unified';

/**
 * Simple, enterprise-grade auth hook
 * Uses Supabase's built-in session management with multi-tenant context
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(() => UnifiedAuth.getState());

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = UnifiedAuth.subscribe(setAuthState);
    
    // Get initial state if not already loaded
    if (authState.isLoading) {
      UnifiedAuth.initialize().then(setAuthState);
    }
    
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string, rememberMe = false) => {
    return UnifiedAuth.login(email, password, rememberMe);
  };

  const logout = async () => {
    return UnifiedAuth.logout();
  };

  const hasAccess = (requiredLevel: number) => {
    return UnifiedAuth.hasAccess(requiredLevel);
  };

  const hasRole = (requiredRole: 'admin' | 'user' | 'viewer') => {
    return UnifiedAuth.hasRole(requiredRole);
  };

  return {
    // State
    user: authState.user,
    session: authState.session,
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    
    // Actions
    login,
    logout,
    
    // Permissions (multi-tenant aware)
    hasAccess,
    hasRole,
    
    // Tenant info (for multi-tenant UI)
    tenant: authState.user?.tenant,
    tenantId: authState.user?.tenant_id,
    accessLevel: authState.user?.access_level,
    role: authState.user?.role
  };
}

/**
 * Hook for getting auth token (for API calls)
 */
export function useAuthToken() {
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    UnifiedAuth.getToken().then(setToken);
    
    const unsubscribe = UnifiedAuth.subscribe((state) => {
      if (state.session) {
        setToken(state.session.access_token);
      } else {
        setToken(null);
      }
    });
    
    return unsubscribe;
  }, []);
  
  return token;
}

/**
 * Hook for multi-tenant context
 */
export function useTenant() {
  const { user } = useAuth();
  
  return {
    tenant: user?.tenant,
    tenantId: user?.tenant_id,
    subdomain: user?.tenant?.subdomain,
    isAdmin: user?.role === 'admin',
    accessLevel: user?.access_level
  };
}




