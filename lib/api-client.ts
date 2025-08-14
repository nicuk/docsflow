// API Client for Frontend-Backend Integration
// Connects to: docsflow.app backend (configurable via environment)

// Enterprise tenant configuration - extracted from subdomain or headers

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
  // Get comprehensive auth headers with tenant context
  getAuthHeaders() {
    const headers: any = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    // Get auth token from cookies or localStorage
    const authToken = this.getAccessToken();
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    // Add tenant subdomain from URL - CRITICAL for proper tenant context
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
        headers['X-Tenant-ID'] = subdomain; // Also add tenant ID for compatibility
        console.log(`🏢 Adding tenant context: ${subdomain}`);
      }
    }
    
    return headers;
  },

  // Get access token from multiple sources
  getAccessToken() {
    if (typeof window === 'undefined') return null;
    
    // Try cookies first
    const authCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth-token='))
      ?.split('=')[1];
    
    if (authCookie) return authCookie;
    
    // Fallback to localStorage
    return localStorage.getItem('access_token');
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
      
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
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
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
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

  // Conversation Management with better error handling
  async getConversations() {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Conversations endpoint not available, using local storage mode:', error);
      return { conversations: [] };
    }
  },

  async createConversation(title?: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
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
      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
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

  async uploadDocument(file: File) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Get auth headers but exclude Content-Type for FormData
      const authHeaders = this.getAuthHeaders();
      delete authHeaders['Content-Type']; // Let browser set this for FormData
      
      const response = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Upload Error:', error);
      throw error;
    }
  },

  async getDocuments() {
    try {
      const response = await fetch(`${API_BASE_URL}/documents`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      return await response.json();
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