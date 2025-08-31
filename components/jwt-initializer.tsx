'use client';

import { useEffect } from 'react';

/**
 * JWT INITIALIZER COMPONENT
 * Ensures JWT session bridge is initialized on app start
 * Must be included in the root layout to catch tokens early
 */
export default function JWTInitializer() {
  useEffect(() => {
    const initializeJWT = async () => {
      try {
        console.log('🔍 [JWT-INITIALIZER] Starting JWT bridge initialization...');
        
        // Import JWT initialization
        const { initializeJWTBridge } = await import('@/lib/jwt-init');
        const success = await initializeJWTBridge();
        
        if (success) {
          console.log('✅ [JWT-INITIALIZER] JWT bridge initialized with existing session');
        } else {
          console.log('ℹ️ [JWT-INITIALIZER] JWT bridge initialized, no existing session found');
        }
        
        // Also check for any existing user sessions
        try {
          const { createClient } = await import('@/lib/supabase-browser');
          const supabase = createClient();
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (session?.access_token) {
            console.log('🎯 [JWT-INITIALIZER] Found Supabase session, user authenticated');
            
            // Manually cache the token since bridge might have missed it
            localStorage.setItem('jwt_access_token', session.access_token);
            localStorage.setItem('jwt_expires_at', session.expires_at?.toString() || '');
            console.log('💾 [JWT-INITIALIZER] Cached session token for API calls');
          } else {
            console.log('ℹ️ [JWT-INITIALIZER] No active Supabase session found');
          }
        } catch (sessionError) {
          console.warn('⚠️ [JWT-INITIALIZER] Session check failed:', sessionError);
        }
        
      } catch (error) {
        console.error('🚨 [JWT-INITIALIZER] Failed to initialize JWT bridge:', error);
      }
    };

    // Initialize immediately
    initializeJWT();
  }, []);

  // This component renders nothing, it's purely for side effects
  return null;
}
