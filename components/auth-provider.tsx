"use client"

import React, { createContext, useContext } from 'react';
import { useAuth } from '@/hooks/use-auth';

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

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, password: string, tenantId?: string, accessLevel?: number) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};