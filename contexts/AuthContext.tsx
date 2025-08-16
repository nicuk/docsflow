'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface Tenant {
  id: string;
  subdomain: string;
  name: string;
  industry?: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  loading: boolean;
  authenticated: boolean;
  onboardingComplete: boolean;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  tenant: null,
  loading: true,
  authenticated: false,
  onboardingComplete: false,
  refreshSession: async () => {},
  logout: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const refreshSession = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/session');
      const data = await response.json();

      if (data.authenticated && data.user) {
        setUser(data.user);
        setTenant(data.tenant);
        setAuthenticated(true);
        setOnboardingComplete(data.onboardingComplete);

        // Handle routing based on auth state and current path
        const publicPaths = ['/login', '/register', '/'];
        const isPublicPath = publicPaths.includes(pathname);
        
        if (!data.onboardingComplete && pathname !== '/onboarding') {
          // User needs onboarding
          router.push('/onboarding');
        } else if (data.onboardingComplete && data.tenant) {
          // User has completed onboarding and has a tenant
          const currentHost = window.location.hostname;
          
          // Only redirect authenticated users away from public pages if they're on the same domain
          // Don't auto-redirect to tenant subdomains from main domain
          if (isPublicPath && currentHost.includes(data.tenant.subdomain)) {
            // User is on their tenant subdomain and visiting public pages - redirect to dashboard
            router.push('/dashboard');
          }
          // If user is on main domain (docsflow.app), let them stay and use the login form
        }
      } else {
        // Not authenticated
        setUser(null);
        setTenant(null);
        setAuthenticated(false);
        setOnboardingComplete(false);
        
        // Redirect to login if on protected route
        const protectedPaths = ['/dashboard', '/onboarding', '/settings'];
        const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
        
        if (isProtectedPath) {
          router.push('/login');
        }
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      setAuthenticated(false);
      setUser(null);
      setTenant(null);
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setTenant(null);
      setAuthenticated(false);
      setOnboardingComplete(false);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [router]);

  useEffect(() => {
    refreshSession();
  }, [pathname]); // Refresh on route change

  // Initial load
  useEffect(() => {
    refreshSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        loading,
        authenticated,
        onboardingComplete,
        refreshSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
