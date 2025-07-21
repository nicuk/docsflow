'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export interface TenantData {
  subdomain: string;
  emoji: string;
  createdAt: number;
  leadCount: number;
  lastActivity: number;
  aiEnabled: boolean;
  subscriptionTier: string;
  settings: Record<string, any>;
  contactEmail?: string;
  displayName?: string;
}

export interface UseTenantReturn {
  tenant: TenantData | null;
  loading: boolean;
  error: string | null;
}

export function useTenant(): UseTenantReturn {
  const params = useParams();
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTenant() {
      try {
        setLoading(true);
        setError(null);
        
        const tenantSlug = params?.tenant as string;
        if (!tenantSlug) {
          setError('No tenant specified');
          return;
        }

        const response = await fetch(`/api/tenant/${tenantSlug}`);
        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to load tenant');
          return;
        }

        const tenantData = await response.json();
        setTenant(tenantData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tenant');
      } finally {
        setLoading(false);
      }
    }

    fetchTenant();
  }, [params?.tenant]);

  return { tenant, loading, error };
} 