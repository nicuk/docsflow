// Frontend authentication client for AI Lead Router SaaS

interface User {
  id: string;
  email: string;
  access_token: string;
  refresh_token: string;
  tenant_id?: string;
  access_level?: number;
  tenant?: {
    id: string;
    subdomain: string;
    name: string;
    industry: string;
    custom_persona: any;
  };
}

interface AuthResponse {
  success: boolean;
  user: User;
  message: string;
}

class AuthClient {
  private baseUrl: string;

  constructor() {
    // Use custom domain now that DNS is fixed
    let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.docsflow.app';
    
    // 🚨 PRODUCTION SAFETY: Never allow localhost in production
    if (baseUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
      console.warn('🚨 SECURITY: Blocking localhost URL in production auth client');
      baseUrl = 'https://api.docsflow.app';
    }
    
    this.baseUrl = baseUrl;
  }

  // Register a new user
  async register(email: string, password: string, companyName?: string, accessLevel: number = 3): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        companyName,
        accessLevel
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    // Store tokens in localStorage AND set cookies for middleware
    if (data.user?.access_token) {
      localStorage.setItem('access_token', data.user.access_token);
      localStorage.setItem('refresh_token', data.user.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Set cookies for middleware compatibility
      document.cookie = `auth-token=${data.user.access_token}; path=/; secure; samesite=strict`;
      if (data.user.tenant_id) {
        document.cookie = `tenant-id=${data.user.tenant_id}; path=/; secure; samesite=strict`;
      }
    }

    return data;
  }

  // Login user
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Store tokens in localStorage
    if (data.user?.access_token) {
      localStorage.setItem('access_token', data.user.access_token);
      localStorage.setItem('refresh_token', data.user.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }

    return data;
  }

  // Get access token
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  // Get current user from storage
  getCurrentUser(): User | null {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      return null;
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const user = this.getCurrentUser();
    return !!(token && user);
  }

  // Restore session from localStorage
  restoreSession(): User | null {
    if (this.isAuthenticated()) {
      return this.getCurrentUser();
    }
    return null;
  }

  // Refresh access token (simplified - in production use proper refresh tokens)
  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        return false;
      }

      // In a real implementation, call backend refresh endpoint
      // For now, just validate current token is still valid
      const user = this.getCurrentUser();
      return !!user;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  // Logout user
  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('user-email');
    localStorage.removeItem('signup-data');
    
    // Clear any tenant context
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('tenant-')) {
        localStorage.removeItem(key);
      }
    });
  }

  // Create authenticated request headers
  getAuthHeaders(): Record<string, string> {
    const token = this.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // Make authenticated API request
  async authenticatedRequest(url: string, options: RequestInit = {}): Promise<any> {
    const headers = this.getAuthHeaders();
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });

    if (response.status === 401) {
      // Token expired, logout user
      this.logout();
      throw new Error('Session expired. Please login again.');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // Google OAuth methods using Supabase
  async initiateGoogleAuth(): Promise<{ authUrl: string; state: string }> {
    try {
      const { supabase } = await import('./supabase');
      
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('Supabase configuration missing. Please check environment variables.');
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Generate state for CSRF protection
      const state = Math.random().toString(36).substring(2, 15);
      return { authUrl: data.url || '', state };
    } catch (error) {
      console.error('Supabase Google OAuth initiation failed:', error);
      throw new Error('Failed to initiate Google sign-in');
    }
  }

  // Handle OAuth callback token
  async handleOAuthCallback(token: string): Promise<AuthResponse> {
    try {
      // Decode the token
      const tokenData = JSON.parse(atob(token));
      
      // Create a user object in the expected format
      const user: User = {
        id: tokenData.user_id,
        email: tokenData.email,
        access_token: token, // Use the OAuth token as access token for now
        refresh_token: '', // Google OAuth doesn't provide refresh tokens in this flow
        tenant_id: tokenData.tenant_id,
        access_level: tokenData.access_level
      };

      // Store tokens in localStorage
      localStorage.setItem('access_token', token);
      localStorage.setItem('user', JSON.stringify(user));

      return {
        success: true,
        user,
        message: 'Google sign-in successful'
      };
    } catch (error) {
      throw new Error('Failed to process OAuth callback');
    }
  }

  // Redirect to Google OAuth
  async signInWithGoogle(): Promise<void> {
    try {
      const { authUrl, state } = await this.initiateGoogleAuth();
      
      // Store state for verification
      localStorage.setItem('oauth-state', state);
      localStorage.setItem('oauth-provider', 'google');
      
      window.location.href = authUrl;
    } catch (error) {
      console.error('Google OAuth error:', error);
      throw new Error('Failed to initiate Google sign-in');
    }
  }

  // Chat with AI using backend API
  async chatWithAI(message: string, tenantSubdomain: string, conversationId?: string): Promise<{
    answer: string;
    sources: Array<{ filename: string; content: string; document_id: string }>;
    confidence: number;
    confidence_level: string;
    metadata: any;
  }> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'X-Tenant-Subdomain': tenantSubdomain
      },
      body: JSON.stringify({
        message,
        conversationId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Chat request failed');
    }

    return data;
  }
}

// Export singleton instance
export const authClient = new AuthClient();
export default authClient; 