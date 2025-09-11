// API Client for Frontend-Backend Integration
// Connects to: docsflow.app backend (configurable via environment)

// Enterprise tenant configuration - extracted from subdomain or headers

// UNIFIED AUTH: Import new auth service for parallel testing
import { AuthService } from '@/lib/services/auth-service';

// Enhanced API base URL logic
const getAPIBaseURL = () => {
  // Use environment variable first, then fallback to production API
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.docsflow.app/api';
  
  // 🚨 PRODUCTION SAFETY: Never allow localhost in production
  if (apiUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
    console.warn('🚨 SECURITY: Blocking localhost URL in production build');
    return 'https://api.docsflow.app/api';
  }
  
  // Enterprise mode - extract tenant from subdomain
  
  return apiUrl;
};

const API_BASE_URL = getAPIBaseURL();

// Health check and fallback logic
let isBackendHealthy = true;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

export const apiClient = {
  // JWT GATEWAY + RLS: Get comprehensive auth headers with tenant context
  async getAuthHeaders() {
    const headers: any = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    // SURGICAL FIX: Enhanced token retrieval with multiple fallbacks
    const authToken = await this.getAccessToken();
    
    // 🧪 PARALLEL TESTING: Try new AuthService alongside existing logic
    let unifiedToken: string | null = null;
    try {
      unifiedToken = await AuthService.getToken();
      if (unifiedToken) {
        console.log('🧪 [UNIFIED-AUTH] Token retrieved via AuthService (parallel test)');
        // Compare tokens for validation
        if (authToken && unifiedToken !== authToken) {
          console.warn('⚠️ [UNIFIED-AUTH] Token mismatch - legacy vs unified');
        }
      } else {
        console.log('🧪 [UNIFIED-AUTH] No token from AuthService');
      }
    } catch (unifiedError) {
      console.warn('🧪 [UNIFIED-AUTH] Parallel test error:', unifiedError);
    }
    
    // 🎯 CRITICAL FIX: Use unified token if primary token is missing
    const finalToken = authToken || unifiedToken;
    
    if (finalToken) {
      // Use BOTH headers - custom header survives Vercel proxy
      headers['Authorization'] = `Bearer ${finalToken}`;
      headers['X-Auth-Token'] = finalToken; // Custom header that Vercel won't strip
      console.log('🔍 [SURGICAL] Auth headers set for cross-domain request:', {
        tokenPreview: finalToken.substring(0, 30) + '...',
        tokenLength: finalToken.length,
        hasValidFormat: finalToken.includes('.'),
        tokenSource: authToken ? 'legacy' : 'unified',
        unifiedMatch: unifiedToken === authToken
      });
    } else {
      console.error('❌ [SURGICAL] No auth token available - debugging session state');
      // Enhanced debugging for token retrieval issues
      try {
        const { createClient } = await import('@/lib/supabase-browser');
        const supabase = createClient();
        const { data: { session }, error } = await supabase.auth.getSession();
        console.error('🔍 [DEBUG] Session state:', {
          hasSession: !!session,
          hasAccessToken: !!session?.access_token,
          sessionError: error,
          tokenPreview: session?.access_token?.substring(0, 30) + '...' || 'none',
          unifiedAvailable: !!unifiedToken
        });
      } catch (debugError) {
        console.error('🔍 [DEBUG] Session check failed:', debugError);
      }
    }
    
    // RLS CONTEXT: Add tenant context for database session
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const subdomain = hostname.split('.')[0];
      
      // Only add tenant headers for actual subdomains (not www, docsflow, or localhost)
      if (subdomain && 
          subdomain !== 'www' && 
          subdomain !== 'docsflow' && 
          subdomain !== 'localhost' &&
          hostname.includes('.docsflow.app')) {
        headers['X-Tenant-Subdomain'] = subdomain;
        
        // RLS CONTEXT: Add tenant UUID from localStorage cache for session context
        const tenantContext = localStorage.getItem('tenant_context');
        if (tenantContext) {
          try {
            const context = JSON.parse(tenantContext);
            if (context.tenantId && context.subdomain === subdomain) {
              headers['X-Tenant-ID'] = context.tenantId;
              headers['X-RLS-Context'] = 'tenant-scoped'; // Signal for RLS context setting
              console.log(`🏢 [RLS-CONTEXT] Adding tenant context: ${subdomain} -> ${context.tenantId.substring(0, 8)}...`);
            }
          } catch (parseError) {
            console.warn('🔍 [RLS-CONTEXT] Failed to parse tenant context:', parseError);
          }
        }
        
        console.log(`🏢 Adding tenant context: ${subdomain}`);
      }
    }
    
    return headers;
  },

  // JWT GATEWAY: Get access token with cross-domain support
  async getAccessToken() {
    if (typeof window === 'undefined') {
      console.log('🔍 [JWT-GATEWAY] Server-side context, no token available');
      return null;
    }
    
    console.log('🔍 [JWT-GATEWAY] Starting token retrieval process...');
    
    // JWT BRIDGE: First check cached token from session bridge
    try {
      const { jwtBridge } = await import('@/lib/jwt-session-bridge');
      const cachedToken = jwtBridge.getCachedToken();
      if (cachedToken) {
        console.log('🔍 [JWT-GATEWAY] Using JWT bridge cached token');
        return cachedToken;
      } else {
        console.log('🔍 [JWT-GATEWAY] No valid token in JWT bridge cache');
      }
    } catch (bridgeError) {
      console.warn('🔍 [JWT-GATEWAY] JWT bridge unavailable, falling back:', bridgeError);
    }
    
    try {
      // CRITICAL FIX: Get token from active Supabase session using SSR client
      const { createClient } = await import('@/lib/supabase-browser');
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (!error && session?.access_token) {
        // JWT GATEWAY: Cache token for cross-domain use
        localStorage.setItem('jwt_access_token', session.access_token);
        localStorage.setItem('jwt_expires_at', session.expires_at?.toString() || '');
        return session.access_token;
      }
    } catch (sessionError) {
      console.warn('🔍 [API-CLIENT] Session token fetch failed, checking legacy cache:', sessionError);
    }
    
    // JWT GATEWAY: Check legacy cached token for cross-domain scenarios
    const cachedToken = localStorage.getItem('jwt_access_token');
    const expiresAt = localStorage.getItem('jwt_expires_at');
    
    if (cachedToken && expiresAt) {
      const expires = new Date(parseInt(expiresAt) * 1000);
      if (expires > new Date()) {
        console.log('🔍 [JWT-GATEWAY] Using legacy cached valid token for cross-domain request');
        return cachedToken;
      } else {
        // Clean expired tokens
        localStorage.removeItem('jwt_access_token');
        localStorage.removeItem('jwt_expires_at');
      }
    }
    
    // SURGICAL FIX: Enhanced Supabase cookie parsing with debugging
    console.log('🔍 [TOKEN-DEBUG] Checking Supabase auth cookies...');
    
    // 🛡️ CRITICAL FIX: Server-side safety check
    if (typeof document === 'undefined') {
      console.warn('🔍 [TOKEN-DEBUG] Server-side context - no cookies available');
      return null;
    }
    
    const allCookies = document.cookie.split('; ');
    const authCookies = allCookies.filter(cookie => 
      cookie.includes('auth-token') || cookie.includes('access_token')
    );
    
    console.log('🔍 [TOKEN-DEBUG] Available auth cookies:', authCookies.map(c => c.split('=')[0]));
    
    const supabaseAuthCookie = allCookies
      .find(row => row.startsWith('sb-') && row.includes('auth-token'))
      ?.split('=')[1];
      
    if (supabaseAuthCookie && supabaseAuthCookie !== '' && supabaseAuthCookie !== 'undefined') {
      try {
        // Supabase cookies are base64-encoded JSON
        const decoded = JSON.parse(atob(supabaseAuthCookie));
        if (decoded.access_token) {
          console.log('🔍 [TOKEN-DEBUG] Successfully extracted token from Supabase cookie');
          return decoded.access_token;
        }
      } catch (parseError) {
        console.warn('🔍 [API-CLIENT] Cookie parse failed:', parseError);
      }
    } else {
      console.warn('🔍 [TOKEN-DEBUG] Supabase auth cookie is empty or undefined');
    }
    
    // Final fallback to legacy cookies
    const authCookie = (typeof document !== 'undefined' ? document.cookie : '')
      .split('; ')
      .find(row => row.startsWith('auth-token=') || row.startsWith('docsflow_auth_token='))
      ?.split('=')[1];
    
    return authCookie || localStorage.getItem('access_token') || null;
  },

  // Enhanced health check with tenant context
  async checkBackendHealth() {
    const now = Date.now();
    if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
      return isBackendHealthy;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers,
        credentials: 'include', // Important for cross-origin cookies
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      isBackendHealthy = response.ok;
      lastHealthCheck = now;
      return isBackendHealthy;
    } catch (error) {
      console.warn('Backend health check failed:', error);
      isBackendHealthy = false;
      lastHealthCheck = now;
      return false;
    }
  },

  // Enhanced sendMessage with conversation support
  async sendMessage(data: { 
    message: string; 
    documentIds?: string[];
    conversationId?: string;
  }) {
    try {
      const headers = await this.getAuthHeaders();
      
      // CRITICAL DEBUG: Log what headers we're sending for chat
      console.log('🔍 [CHAT] Headers being sent:', {
        hasAuthorization: !!headers.Authorization,
        hasXAuthToken: !!headers['X-Auth-Token'],
        authPreview: headers.Authorization ? headers.Authorization.substring(0, 30) + '...' : 'none',
        allHeaders: headers
      });
      
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers,
        credentials: 'include', // Critical for cross-origin cookies
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Chat API Error:', error);
      // TODO:LIVE - Real API connection established, no fallback needed
      throw error; // Let the component handle the error properly
    }
  },

  // SURGICAL FIX: Enhanced error handling for React Query retries
  async handleApiResponse(response: Response, operation: string) {
    if (!response.ok) {
      if (response.status === 401) {
        // 401 = auth token missing/expired - this is temporary, should retry
        console.log(`🔄 [${operation}] Auth required - React Query will retry`);
        const error = new Error(`Authentication required for ${operation}`);
        (error as any).name = 'AuthError';
        (error as any).retry = true;
        throw error;
      }
      throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
  },

  // Conversation Management with better error handling
  async getConversations() {
    try {
      const headers = await this.getAuthHeaders();
      
      // CRITICAL DEBUG: Log what headers we're actually sending
      console.log('🔍 [CONVERSATIONS] Headers being sent:', {
        hasAuthorization: !!headers.Authorization,
        authPreview: headers.Authorization ? headers.Authorization.substring(0, 30) + '...' : 'none',
        allHeaders: headers
      });
      
      const response = await fetch(`${API_BASE_URL}/conversations`, {
        method: 'GET',
        headers,
        credentials: 'include', // CRITICAL FIX: Include cookies for cross-domain auth
      });
      
      return await this.handleApiResponse(response, 'CONVERSATIONS');
    } catch (error) {
      console.warn('Conversations endpoint not available, using local storage mode:', error);
      return { conversations: [] };
    }
  },

  async createConversation(title?: string) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/conversations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title }),
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Create conversation failed:', error);
      // TODO:LIVE - For now, create local fallback but in production this should be handled properly
      const mockConversation = {
        id: 'local-' + Date.now(),
        title: title || 'Chat Session',
        createdAt: new Date().toISOString()
      };
      return { conversation: mockConversation };
    }
  },

  async getConversationHistory(conversationId: string) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Conversation history endpoint not available, using local storage:', error);
      return { messages: [] };
    }
  },

  async uploadDocument(file: File, onProgress?: (progress: number) => void) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Get auth headers but exclude Content-Type for FormData
      const authHeaders = await this.getAuthHeaders();
      delete authHeaders['Content-Type']; // Let browser set this for FormData
      
      // 🚀 ENHANCED: Real progress tracking with XMLHttpRequest
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error('Invalid response format'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error || `Upload Error: ${xhr.status}`));
            } catch {
              reject(new Error(`Upload Error: ${xhr.status}`));
            }
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });
        
        xhr.open('POST', `${API_BASE_URL}/documents/upload`);
        
        // Set headers
        Object.entries(authHeaders).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value as string);
        });
        
        xhr.send(formData);
      });
    } catch (error) {
      console.error('Upload Error:', error);
      throw error;
    }
  },

  async getDocuments() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/documents`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });
      
      return await this.handleApiResponse(response, 'DOCUMENTS');
    } catch (error) {
      console.error('Documents API Error:', error);
      throw error;
    }
  },

  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return await response.json();
    } catch (error) {
      console.error('Health Check Error:', error);
      throw error;
    }
  }
}; 