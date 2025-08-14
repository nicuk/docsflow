// Simplified subdomains.ts for MVP - no Redis dependency
// This will be replaced when we integrate with AI Lead Router backend

export function isValidIcon(str: string) {
  if (str.length > 10) {
    return false;
  }
  return str.length >= 1 && str.length <= 10;
}

type SubdomainData = {
  id: string; // UUID of the tenant
  subdomain: string; // Subdomain string
  emoji: string;
  createdAt: number;
  leadCount: number;
  lastActivity: number;
  aiEnabled: boolean;
  subscriptionTier: string;
  settings: Record<string, any>;
  contactEmail?: string;
  displayName?: string;
};

function sanitizeSubdomain(subdomain: string) {
  return subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export async function getSubdomainData(
  subdomain: string
): Promise<SubdomainData | null> {
  const sanitized = sanitizeSubdomain(subdomain);
  
  // Enterprise mode: Query real tenant data via API
  try {
    const response = await fetch(`/api/tenants/${sanitized}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      // No tenant found or error
      return null;
    }
    
    const tenant = await response.json();
    
    return {
      id: tenant.id, // CRITICAL: Include the UUID
      subdomain: tenant.subdomain,
      emoji: '🏢',
      createdAt: new Date(tenant.created_at).getTime(),
      leadCount: tenant.leadCount || 0,
      lastActivity: new Date(tenant.updated_at).getTime(),
      aiEnabled: true,
      subscriptionTier: tenant.plan_type || 'starter',
      settings: tenant.settings || {},
      contactEmail: tenant.email_config?.contact_email || 'contact@' + sanitized + '.com',
      displayName: tenant.name
    };
  } catch (error) {
    console.error('Error fetching tenant data:', error);
    return null;
  }
}

export async function getAllSubdomains() {
  // For MVP, return empty array
  return [];
}

export async function updateTenantMetadata(
  subdomain: string,
  updates: Partial<SubdomainData>
): Promise<SubdomainData> {
  const existing = await getSubdomainData(subdomain);
  if (!existing) {
    throw new Error(`Tenant "${subdomain}" not found`);
  }
  return { ...existing, ...updates };
}

export async function incrementLeadCount(
  subdomain: string
): Promise<number> {
  const existing = await getSubdomainData(subdomain);
  if (!existing) {
    throw new Error(`Tenant "${subdomain}" not found`);
  }
  return existing.leadCount + 1;
}

export async function updateLastActivity(
  subdomain: string
): Promise<number> {
  return Date.now();
}
