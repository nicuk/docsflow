/**
 * JWT INITIALIZATION
 * Initialize JWT Session Bridge as early as possible to prevent timing issues
 * Import this in your main layout or app component
 */

// Initialize JWT Bridge immediately when this module loads
if (typeof window !== 'undefined') {
  console.log('🔍 [JWT-INIT] Initializing JWT Session Bridge...');
  
  // Dynamic import to avoid SSR issues
  import('@/lib/jwt-session-bridge').then(({ jwtBridge }) => {
    // Force a refresh of the token cache on app start
    jwtBridge.refreshTokenCache().then((success) => {
      if (success) {
        console.log('🔍 [JWT-INIT] Initial token cache populated successfully');
      } else {
        console.log('🔍 [JWT-INIT] No active session found during initialization');
      }
    });
  }).catch((error) => {
    console.error('🔍 [JWT-INIT] Failed to initialize JWT bridge:', error);
  });
}

// Export a function to manually initialize if needed
export const initializeJWTBridge = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  
  try {
    const { jwtBridge } = await import('@/lib/jwt-session-bridge');
    return await jwtBridge.refreshTokenCache();
  } catch (error) {
    console.error('🔍 [JWT-INIT] Manual initialization failed:', error);
    return false;
  }
};
