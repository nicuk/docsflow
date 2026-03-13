// API Client for Frontend-Backend Integration
// Connects to: docsflow.app backend (configurable via environment)

// Enterprise tenant configuration - extracted from subdomain or headers

// Using Clerk tokens only (no legacy AuthService)

// Enhanced API base URL logic
const getAPIBaseURL = () => {
  // Use current subdomain for API calls (tenant-aware)
  if (typeof window !== 'undefined') {
    const currentHost = window.location.host;
    
    // If we're on a tenant subdomain (e.g., acme.docsflow.app), use it for API
    if (currentHost.includes('.docsflow.app') && !currentHost.startsWith('www.')) {
      return `https://${currentHost}/api`;
    }
  }
  
  // Fallback: Use environment variable or main API
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.docsflow.app/api';
  
  // Never allow localhost in production
  if (apiUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
    return 'https://api.docsflow.app/api';
  }
  
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
    
    // Get Clerk token
    const authToken = await this.getAccessToken();
    const finalToken = authToken;
    
    if (finalToken) {
      // Use BOTH headers - custom header survives Vercel proxy
      headers['Authorization'] = `Bearer ${finalToken}`;
      headers['X-Auth-Token'] = finalToken; // Custom header that Vercel won't strip
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
        const tenantContext = typeof localStorage !== 'undefined' ? localStorage.getItem('tenant_context') : null;
        if (tenantContext) {
          try {
            const context = JSON.parse(tenantContext);
            if (context.tenantId && context.subdomain === subdomain) {
              headers['X-Tenant-ID'] = context.tenantId;
              headers['X-RLS-Context'] = 'tenant-scoped'; // Signal for RLS context setting
            }
          } catch (parseError) {
            // Failed to parse tenant context - continue without tenant ID
          }
        }
      }
    }
    
    return headers;
  },

  // Get Clerk session token for API calls
  async getAccessToken() {
    if (typeof window === 'undefined') {
      return null;
    }
    
    try {
      // Access the global Clerk instance (set by ClerkProvider)
      // window.Clerk is available after ClerkProvider initializes
      if (typeof window !== 'undefined' && (window as any).Clerk) {
        const clerk = (window as any).Clerk;
        
        // Get the session token from Clerk
        const token = await clerk.session?.getToken();
        
        if (token) {
          return token;
        }
      }
    } catch {
      // Clerk token retrieval failed - will try cookie fallback
    }
    
    // Fallback: Try to get token from Clerk cookies
    if (typeof document !== 'undefined') {
      const allCookies = document.cookie.split('; ');
      const clerkSession = allCookies.find(row => row.startsWith('__session='));
      
      if (clerkSession) {
        // Extract JWT from __session cookie
        const token = clerkSession.split('=')[1];
        return token;
      }
    }
    
    return null;
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
      throw error;
    }
  },

  // Enhanced error handling for React Query retries
  async handleApiResponse(response: Response, operation: string) {
    if (!response.ok) {
      if (response.status === 401) {
        // 401 = auth token missing/expired - this is temporary, should retry
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
      
      const response = await fetch(`${API_BASE_URL}/conversations`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });
      
      return await this.handleApiResponse(response, 'CONVERSATIONS');
    } catch (error) {
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
      
      // Real progress tracking with XMLHttpRequest
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
        
        xhr.open('POST', `${API_BASE_URL}/documents/upload`); // Reverted: queue system not working
        
        // Set headers
        Object.entries(authHeaders).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value as string);
        });
        
        xhr.send(formData);
      });
    } catch (error) {
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
      throw error;
    }
  },

  async deleteDocument(documentId: string) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/documents`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
        body: JSON.stringify({ documentId }),
      });
      
      return await this.handleApiResponse(response, 'DELETE_DOCUMENT');
    } catch (error) {
      throw error;
    }
  },

  async cleanupStuckDocuments() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/documents/cleanup-stuck`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      
      return await this.handleApiResponse(response, 'CLEANUP_STUCK');
    } catch (error) {
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
      throw error;
    }
  }
}; 