import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { TenantProvider } from '@/components/tenant-provider';
import { getSubdomainData } from '@/lib/subdomains';
import { createClient } from '@supabase/supabase-js';
import type { TenantContext } from '@/types/tenant';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { tenant: tenantSlug } = await params;
  const headersList = await headers();
  
  // Get tenant ID from middleware header
  const tenantIdFromHeader = headersList.get('x-tenant-id');
  
  // Validate that the route param matches the header (security check)
  if (tenantIdFromHeader && tenantIdFromHeader !== tenantSlug) {
    console.warn(`Tenant mismatch: header=${tenantIdFromHeader}, route=${tenantSlug}`);
    notFound();
  }

  // Helper function to transform SubdomainData to TenantContext
  const transformToTenantContext = (data: any, subdomain: string): TenantContext => {
    return {
      id: data.id || subdomain,
      subdomain: subdomain,
      name: data.name || data.organizationName || data.displayName || `${subdomain} Organization`,
      industry: data.industry || 'general',
      logo: data.logo_url || data.logoUrl,
      theme: {
        primary: data.primary_color || data.branding?.primaryColor || '#3b82f6',
        secondary: data.secondary_color || data.branding?.secondaryColor || '#1e40af',
        accent: data.accent_color || '#f59e0b'
      },
      settings: {
        businessHours: data.settings?.businessHours || '9:00 AM - 5:00 PM',
        timezone: data.settings?.timezone || 'UTC',
        slaTarget: data.settings?.slaTarget || 24
      },
      // Additional fields
      custom_persona: data.custom_persona,
      subscription_status: data.subscription_status || 'trial',
      plan_type: data.plan_type || 'starter',
      created_at: data.created_at,
      branding: {
        logoUrl: data.logo_url || data.logoUrl,
        primaryColor: data.primary_color || '#3b82f6',
        secondaryColor: data.secondary_color || '#1e40af',
      },
      createdAt: data.createdAt || new Date(data.created_at || Date.now()).getTime(),
      leadCount: data.leadCount || 0,
      lastActivity: data.lastActivity || Date.now(),
      aiEnabled: data.aiEnabled ?? true,
      subscriptionTier: data.subscriptionTier || data.plan_type || 'free',
      contactEmail: data.contactEmail || data.contact_email,
      displayName: data.displayName || data.name,
      emoji: data.emoji || '🏢'
    };
  };

  try {
    let tenantData: TenantContext | null = null;
    
    // First try to get tenant data from Redis/cache
    const cachedTenantData = await getSubdomainData(tenantSlug);
    
    if (cachedTenantData) {
      // Transform cached data to TenantContext
      tenantData = transformToTenantContext(cachedTenantData, tenantSlug);
    } else {
      // If not in cache, fetch from Supabase
      const { data: supabaseTenant, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('subdomain', tenantSlug)
        .single();

      if (error || !supabaseTenant) {
        console.error('Tenant not found:', error);
        notFound();
      }

      // Transform Supabase data to TenantContext
      tenantData = transformToTenantContext(supabaseTenant, tenantSlug);
    }

    if (!tenantData) {
      notFound();
    }

    // Get list of available tenants for tenant switching (optional)
    const availableTenants: TenantContext[] = [tenantData]; // For now, just current tenant

    return (
      <TenantProvider initialTenant={tenantData} tenants={availableTenants}>
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </TenantProvider>
    );

  } catch (error) {
    console.error('Error loading tenant data:', error);
    notFound();
  }
}
