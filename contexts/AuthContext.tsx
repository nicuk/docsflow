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
  // 🎯 CLERK MIGRATION: Use Clerk's hooks directly
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
      console.error('Clerk logout error:', error);
    }
  }, [signOut, router]);

  // 🎯 CLERK MIGRATION: Sync Clerk user to our state
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
      if (!onboardingDone && pathname !== '/onboarding') {
        router.push('/onboarding')
      }
      
      console.log('✅ [CLERK AUTH CONTEXT] User synced:', {
        email,
        name,
        role,
        authenticated: true,
        onboardingComplete: onboardingDone,
      })
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
