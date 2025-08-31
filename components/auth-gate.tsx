'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface AuthGateProps {
  children: React.ReactNode;
}

/**
 * SURGICAL AUTH GATE
 * Blocks entire app until authentication state is properly initialized
 * Eliminates all race conditions by ensuring auth is ready BEFORE components mount
 */
export default function AuthGate({ children }: AuthGateProps) {
  const [authReady, setAuthReady] = useState(false);
  const [authState, setAuthState] = useState<{
    isAuthenticated: boolean;
    user: any;
    tenant: any;
    error?: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      console.log('🔍 [AUTH-GATE] Starting surgical auth initialization...');
      
      try {
        // Step 1: Initialize JWT bridge FIRST
        console.log('🔍 [AUTH-GATE] Step 1: Initializing JWT bridge...');
        const { initializeJWTBridge } = await import('@/lib/jwt-init');
        await initializeJWTBridge();
        console.log('✅ [AUTH-GATE] JWT bridge initialized');

        // Step 2: Check authentication status
        console.log('🔍 [AUTH-GATE] Step 2: Checking auth status...');
        const sessionResponse = await fetch('/api/auth/session');
        const sessionData = await sessionResponse.json();
        
        if (!isMounted) return;

        if (sessionData.authenticated) {
          console.log('✅ [AUTH-GATE] User authenticated:', sessionData.user?.email);
          
          // Step 3: Ensure token is cached for API calls
          console.log('🔍 [AUTH-GATE] Step 3: Ensuring token cache...');
          try {
            const { createClient } = await import('@/lib/supabase-browser');
            const supabase = createClient();
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (!error && session?.access_token) {
              localStorage.setItem('jwt_access_token', session.access_token);
              localStorage.setItem('jwt_expires_at', session.expires_at?.toString() || '');
              console.log('✅ [AUTH-GATE] Token cached for API calls');
            }
          } catch (tokenError) {
            console.warn('⚠️ [AUTH-GATE] Token caching failed:', tokenError);
          }

          setAuthState({
            isAuthenticated: true,
            user: sessionData.user,
            tenant: sessionData.tenant
          });
        } else {
          console.log('ℹ️ [AUTH-GATE] User not authenticated');
          setAuthState({
            isAuthenticated: false,
            user: null,
            tenant: null
          });
        }

        console.log('✅ [AUTH-GATE] Auth initialization complete');
        setAuthReady(true);

      } catch (error) {
        console.error('🚨 [AUTH-GATE] Auth initialization failed:', error);
        if (isMounted) {
          setAuthState({
            isAuthenticated: false,
            user: null,
            tenant: null,
            error: error instanceof Error ? error.message : 'Auth initialization failed'
          });
          setAuthReady(true); // Still allow app to load
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Show loading while auth initializes
  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-semibold mb-2">Initializing Authentication</h3>
            <p className="text-gray-600 text-sm">
              Setting up secure multi-tenant access...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Auth is ready - render the app
  return <>{children}</>;
}
