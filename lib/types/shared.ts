// Unified type definitions for monorepo
// Based on working frontend types as source of truth

export interface SubdomainData {
  emoji: string;
  createdAt: number;
  leadCount: number;
  lastActivity: number;
  aiEnabled: boolean;
  subscriptionTier: string;
  settings: Record<string, any>;
  contactEmail?: string;
  displayName?: string; // ✅ Frontend uses displayName, not organizationName
}

export interface TenantSettings {
  displayName?: string; // ✅ Aligned with frontend
  contactEmail?: string;
  aiEnabled?: boolean;
  notifications?: boolean;
  description?: string;
}

export interface OnboardingData {
  displayName?: string; // ✅ Aligned with frontend
  subdomain?: string;
  isNewTenant?: boolean;
  userRole?: string;
}

// Legacy compatibility - to be removed after migration
export interface LegacyTenantSettings {
  organizationName?: string; // ❌ Legacy - will be replaced
  contactEmail?: string;
  displayName?: string;
  aiEnabled?: boolean;
}
