'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Define the shape of the tenant data and the context
interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  settings: {
    maxUsers?: number;
    features?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
}

// Create the context with a default value
const TenantContext = createContext<TenantContextType | undefined>(undefined);

// Define the props for the provider component
interface TenantProviderProps {
  children: ReactNode;
  tenantId: string | null; // UUID for internal context
  tenantSubdomain?: string | null; // Subdomain for API calls
}

export function TenantProvider({ children, tenantId, tenantSubdomain }: TenantProviderProps) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!tenantId && !tenantSubdomain) {
      setIsLoading(false);
      return;
    }

    const fetchTenantData = async () => {
      setIsLoading(true);
      try {
        // SECURITY FIX: Use subdomain for API path, UUID for validation
        const apiIdentifier = tenantSubdomain || tenantId;
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || (typeof window !== 'undefined' && window.location.origin) || '';
        const response = await fetch(`${baseUrl}/api/tenants/${apiIdentifier}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            console.warn(`Tenant not found: ${tenantId}`);
            setTenant(null);
            return;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const tenantData: Tenant = await response.json();
        setTenant(tenantData);
        
        console.log(`✅ Loaded tenant data for: ${apiIdentifier}`, tenantData);
      } catch (error) {
        console.error('Failed to fetch tenant data:', error);
        setTenant(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenantData();
  }, [tenantId, tenantSubdomain]);

  return (
    <TenantContext.Provider value={{ tenant, isLoading }}>
      {children}
    </TenantContext.Provider>
  );
}

// Custom hook to use the tenant context
export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
