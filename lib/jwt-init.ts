/**
 * JWT INITIALIZATION
 * Initialize JWT Session Bridge as early as possible to prevent timing issues
 * Import this in your main layout or app component
 */

// Initialize JWT Bridge immediately when this module loads
if (typeof window !== 'undefined') {
  // Dynamic import to avoid SSR issues
  import('@/lib/jwt-session-bridge').then(({ jwtBridge }) => {
    jwtBridge.refreshTokenCache();
  }).catch(() => {
    // JWT bridge initialization failed
  });
}

// Export a function to manually initialize if needed
export const initializeJWTBridge = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  
  try {
    const { jwtBridge } = await import('@/lib/jwt-session-bridge');
    return await jwtBridge.refreshTokenCache();
  } catch {
    return false;
  }
};
