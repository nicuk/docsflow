import { redis } from '@/lib/redis';

export function isValidIcon(str: string) {
  if (str.length > 10) {
    return false;
  }

  try {
    // Primary validation: Check if the string contains at least one emoji character
    // This regex pattern matches most emoji Unicode ranges
    const emojiPattern = /[\p{Emoji}]/u;
    if (emojiPattern.test(str)) {
      return true;
    }
  } catch (error) {
    // If the regex fails (e.g., in environments that don't support Unicode property escapes),
    // fall back to a simpler validation
    console.warn(
      'Emoji regex validation failed, using fallback validation',
      error
    );
  }

  // Fallback validation: Check if the string is within a reasonable length
  // This is less secure but better than no validation
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
  const data = await redis.get<any>(`subdomain:${sanitized}`);
  if (!data) {
    return null;
  }

  return {
    emoji: data.emoji,
    createdAt: data.createdAt,
    leadCount:
      typeof data.leadCount === 'number' ? data.leadCount : 0,
    lastActivity:
      typeof data.lastActivity === 'number'
        ? data.lastActivity
        : data.createdAt,
    aiEnabled:
      typeof data.aiEnabled === 'boolean' ? data.aiEnabled : false,
    subscriptionTier:
      typeof data.subscriptionTier === 'string'
        ? data.subscriptionTier
        : 'free',
    settings:
      typeof data.settings === 'object' && data.settings !== null
        ? data.settings
        : {},
    contactEmail:
      typeof data.contactEmail === 'string'
        ? data.contactEmail
        : undefined,
    displayName:
      typeof data.displayName === 'string'
        ? data.displayName
        : undefined
  };
}

export async function getAllSubdomains() {
  const keys = await redis.keys('subdomain:*');

  if (!keys.length) {
    return [];
  }

  const values = await redis.mget<any[]>(...keys);

  return keys.map((key, index) => {
    const subdomain = key.replace('subdomain:', '');
    const data = values[index] || {};

    return {
      subdomain,
      emoji: data.emoji || '❓',
      createdAt: data.createdAt || Date.now()
    };
  });
}

export async function updateTenantMetadata(
  subdomain: string,
  updates: Partial<SubdomainData>
): Promise<SubdomainData> {
  const existing = await getSubdomainData(subdomain);
  if (!existing) {
    throw new Error(`Tenant "${subdomain}" not found`);
  }

  const merged: SubdomainData = {
    ...existing,
    ...updates
  };

  const sanitized = sanitizeSubdomain(subdomain);
  await redis.set(`subdomain:${sanitized}`, merged);

  return merged;
}

export async function incrementLeadCount(
  subdomain: string
): Promise<number> {
  const existing = await getSubdomainData(subdomain);
  if (!existing) {
    throw new Error(`Tenant "${subdomain}" not found`);
  }

  const newCount = existing.leadCount + 1;
  await updateTenantMetadata(subdomain, { leadCount: newCount });
  return newCount;
}

export async function updateLastActivity(
  subdomain: string
): Promise<number> {
  const existing = await getSubdomainData(subdomain);
  if (!existing) {
    throw new Error(`Tenant "${subdomain}" not found`);
  }

  const timestamp = Date.now();
  await updateTenantMetadata(subdomain, { lastActivity: timestamp });
  return timestamp;
}