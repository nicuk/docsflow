'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';

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
  created_at?: string;
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  settings?: {
    maxUsers?: number;
    features?: string[];
  };
  createdAt?: string;
  updatedAt?: string;
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
  const { user: clerkUser, isLoaded } = useUser()
  const { signOut } = useClerk()
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const refreshSession = useCallback(async () => {
    // No-op for Clerk - sync happens in useEffect
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut()
      setUser(null);
      setTenant(null);
      setAuthenticated(false);
      setOnboardingComplete(false);
      router.push('/login');
    } catch (error) {
      // Clerk logout error
    }
  }, [signOut, router]);

  // Sync Clerk user to our state
  useEffect(() => {
    const syncClerkUser = () => {
      if (!isLoaded) {
        setLoading(true)
        return
      }

      setLoading(false)

      if (!clerkUser) {
        setUser(null)
        setTenant(null)
        setAuthenticated(false)
        setOnboardingComplete(false)

        // Redirect to login if on protected route
        const protectedPaths = ['/dashboard', '/onboarding', '/settings']
        const publicPaths = ['/login', '/signup', '/register', '/', '/verify-email']
        const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
        const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

        if (isProtectedPath && !isPublicPath) {
          router.push('/login')
        }
        return
      }

      // Extract user data from Clerk
      const email = clerkUser.emailAddresses[0]?.emailAddress || ''
      const name = clerkUser.firstName || email.split('@')[0] || 'User'
      const role = (clerkUser.publicMetadata?.role as string) || 'member'
      const tenantId = (clerkUser.publicMetadata?.tenantId as string) || ''
      const onboardingDone = (clerkUser.publicMetadata?.onboardingComplete as boolean) || false

      setUser({
        id: clerkUser.id,
        email,
        name,
        role,
      })

      setAuthenticated(true)
      setOnboardingComplete(onboardingDone)

      // Get tenant from metadata if available
      if (tenantId) {
        const tenantSubdomain = (clerkUser.publicMetadata?.tenantSubdomain as string) || ''
        const tenantName = (clerkUser.publicMetadata?.tenantName as string) || ''
        
        setTenant({
          id: tenantId,
          subdomain: tenantSubdomain,
          name: tenantName,
          created_at: clerkUser.createdAt?.toString() || '',
        })
      }

      // Handle onboarding redirect
      // Skip if user just completed onboarding (check URL parameter)
      const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
      const justCompletedOnboarding = searchParams?.get('onboarding') === 'complete'
      
      // Only redirect to onboarding from public pages, not from the dashboard,
      // to avoid blocking navigation when Clerk metadata has async delay.
      const publicPages = ['/login', '/signup', '/', '/verify-email']
      const isPublicPage = publicPages.some(page => pathname === page || pathname.startsWith(page + '/'))
      const isDashboard = pathname.startsWith('/dashboard')
      
      if (!onboardingDone && isPublicPage && !justCompletedOnboarding) {
        router.push('/onboarding')
      }
      
      // Clean up URL parameter after first load
      if (justCompletedOnboarding && typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.delete('onboarding')
        window.history.replaceState({}, '', url.toString())
      }
      
    }

    syncClerkUser()
  }, [isLoaded, clerkUser, pathname, router])

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
