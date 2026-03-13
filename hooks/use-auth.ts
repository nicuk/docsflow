import { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';

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

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  useEffect(() => {
    // Restore session on app load
    const restoreSession = async () => {
      try {
        const user = await authClient.restoreSession();
        
        if (user) {
          // Validate token is still valid
          const isValid = await authClient.refreshToken();
          
          if (isValid) {
            setAuthState({
              user,
              isAuthenticated: true,
              isLoading: false
            });
          } else {
            // Token invalid, clear session
            authClient.logout();
            setAuthState({
              user: null,
              isAuthenticated: false,
              isLoading: false
            });
          }
        } else {
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false
          });
        }
      } catch (error) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authClient.login(email, password);
      
      if (response.success) {
        setAuthState({
          user: response.user,
          isAuthenticated: true,
          isLoading: false
        });
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string, tenantId?: string, accessLevel?: number) => {
    try {
      const response = await authClient.register(email, password, tenantId, accessLevel);
      
      if (response.success) {
        setAuthState({
          user: response.user,
          isAuthenticated: true,
          isLoading: false
        });
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authClient.logout();
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false
    });
  };

  return {
    ...authState,
    login,
    register,
    logout
  };
};