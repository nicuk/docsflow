/**
 * SAFE BASE64 DECODER
 * Handles malformed/URL-encoded Supabase cookies
 */

export class SafeBase64Decoder {
  /**
   * Safely decode base64 with multiple fallback strategies
   */
  static decode(encodedString: string): any | null {
    if (!encodedString || typeof encodedString !== 'string') {
      return null;
    }

    // Strategy 1: Direct base64 decode
    try {
      const decoded = JSON.parse(atob(encodedString));
      return decoded;
    } catch (directError) {
      console.warn('🔧 [SAFE-DECODER] Direct decode failed, trying URL decode...');
    }

    // Strategy 2: URL decode first, then base64
    try {
      const urlDecoded = decodeURIComponent(encodedString);
      const decoded = JSON.parse(atob(urlDecoded));
      console.log('✅ [SAFE-DECODER] URL decode + base64 successful');
      return decoded;
    } catch (urlError) {
      console.warn('🔧 [SAFE-DECODER] URL decode failed, trying manual cleanup...');
    }

    // Strategy 3: Manual cleanup of common issues
    try {
      // Remove potential prefix/suffix issues
      let cleaned = encodedString.trim();
      
      // Remove 'base64-' prefix if present (from logs)
      if (cleaned.startsWith('base64-')) {
        cleaned = cleaned.substring(7);
      }
      
      // Ensure proper base64 padding
      while (cleaned.length % 4) {
        cleaned += '=';
      }
      
      const decoded = JSON.parse(atob(cleaned));
      console.log('✅ [SAFE-DECODER] Manual cleanup successful');
      return decoded;
    } catch (cleanupError) {
      console.warn('🔧 [SAFE-DECODER] Manual cleanup failed, trying character replacement...');
    }

    // Strategy 4: Replace problematic characters
    try {
      let cleaned = encodedString
        .replace(/[^A-Za-z0-9+/=]/g, '') // Remove non-base64 chars
        .replace(/-/g, '+')               // URL-safe base64 fixes
        .replace(/_/g, '/');              // URL-safe base64 fixes
      
      // Ensure proper padding
      while (cleaned.length % 4) {
        cleaned += '=';
      }
      
      const decoded = JSON.parse(atob(cleaned));
      console.log('✅ [SAFE-DECODER] Character replacement successful');
      return decoded;
    } catch (charError) {
      console.error('❌ [SAFE-DECODER] All decode strategies failed:', {
        originalLength: encodedString.length,
        originalPreview: encodedString.substring(0, 50) + '...',
        error: charError.message
      });
      return null;
    }
  }

  /**
   * Extract access token from Supabase session data
   */
  static extractAccessToken(sessionData: any): string | null {
    if (!sessionData || typeof sessionData !== 'object') {
      return null;
    }

    // Try different property names
    return sessionData.access_token || 
           sessionData.accessToken || 
           sessionData.token ||
           sessionData.jwt ||
           null;
  }

  /**
   * Safe cookie parsing with comprehensive fallback
   */
  static parseSupabaseCookie(cookieValue: string): string | null {
    const sessionData = this.decode(cookieValue);
    if (!sessionData) {
      return null;
    }

    const accessToken = this.extractAccessToken(sessionData);
    if (accessToken) {
      console.log('✅ [SAFE-DECODER] Successfully extracted access token');
      return accessToken;
    }

    console.warn('❌ [SAFE-DECODER] Session data found but no access token:', 
      Object.keys(sessionData));
    return null;
  }
}
