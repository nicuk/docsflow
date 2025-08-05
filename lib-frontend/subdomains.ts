// Simplified subdomains.ts for MVP - no Redis dependency
// This will be replaced when we integrate with AI Lead Router backend

export function isValidIcon(str: string) {
  if (str.length > 10) {
    return false;
  }
  return str.length >= 1 && str.length <= 10;
}

type SubdomainData = {
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
  
  // For MVP, return demo data for any subdomain
  // This will be replaced with real Redis integration later
  return {
    emoji: '🏢',
    createdAt: Date.now(),
    leadCount: 0,
    lastActivity: Date.now(),
    aiEnabled: true,
    subscriptionTier: 'demo',
    settings: {},
    contactEmail: 'demo@example.com',
    displayName: `Demo Tenant (${sanitized})`
  };
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
