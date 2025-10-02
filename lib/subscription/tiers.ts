/**
 * Subscription Tiers & Limits
 * 
 * Defines pricing tiers and their associated limits/features.
 * Used for enforcement across upload, query, and storage operations.
 */

// =====================================================
// TIER DEFINITIONS
// =====================================================

export const SUBSCRIPTION_TIERS = {
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
  CUSTOM: 'custom'
} as const;

export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS];

// =====================================================
// TIER LIMITS
// =====================================================

export interface TierLimits {
  // Pricing
  monthly_price: number;
  
  // Document limits
  max_documents_total: number;
  max_documents_per_month: number;
  max_concurrent_uploads: number;        // How many files can upload at once
  max_file_size_mb: number;
  
  // Query limits
  max_queries_per_month: number;
  max_concurrent_queries: number;
  
  // Team limits
  max_team_members: number;
  max_subdomains: number;
  
  // Feature flags
  features: {
    api_access: boolean;
    custom_branding: boolean;
    priority_support: boolean;
    dedicated_support: boolean;
    sla_guarantee: boolean;
    custom_integrations: boolean;
    premium_ai_models: boolean;         // Claude, GPT-4
    white_label: boolean;
    soc2_compliance: boolean;
  };
  
  // Support SLA
  support_response_time_hours: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  // ===== STARTER TIER ($149/month) =====
  [SUBSCRIPTION_TIERS.STARTER]: {
    monthly_price: 149,
    
    // Documents
    max_documents_total: 500,
    max_documents_per_month: 500,
    max_concurrent_uploads: 5,          // 5 files at once
    max_file_size_mb: 10,
    
    // Queries
    max_queries_per_month: 10_000,
    max_concurrent_queries: 3,
    
    // Team
    max_team_members: 5,
    max_subdomains: 1,
    
    // Features
    features: {
      api_access: false,
      custom_branding: false,
      priority_support: false,
      dedicated_support: false,
      sla_guarantee: false,
      custom_integrations: false,
      premium_ai_models: false,
      white_label: false,
      soc2_compliance: false,
    },
    
    // Support
    support_response_time_hours: 48,
  },
  
  // ===== PROFESSIONAL TIER ($599/month) =====
  [SUBSCRIPTION_TIERS.PROFESSIONAL]: {
    monthly_price: 599,
    
    // Documents
    max_documents_total: 5_000,
    max_documents_per_month: 1_500,
    max_concurrent_uploads: 10,         // 10 files at once
    max_file_size_mb: 50,
    
    // Queries
    max_queries_per_month: 40_000,
    max_concurrent_queries: 10,
    
    // Team
    max_team_members: -1,               // Unlimited
    max_subdomains: 5,
    
    // Features
    features: {
      api_access: true,
      custom_branding: true,
      priority_support: true,
      dedicated_support: false,
      sla_guarantee: false,
      custom_integrations: false,
      premium_ai_models: false,         // Available as +$199 add-on
      white_label: true,
      soc2_compliance: false,
    },
    
    // Support
    support_response_time_hours: 24,
  },
  
  // ===== ENTERPRISE TIER ($2,199/month) =====
  [SUBSCRIPTION_TIERS.ENTERPRISE]: {
    monthly_price: 2199,
    
    // Documents
    max_documents_total: 25_000,
    max_documents_per_month: 8_000,
    max_concurrent_uploads: 30,         // 30 files at once
    max_file_size_mb: 100,
    
    // Queries
    max_queries_per_month: 150_000,
    max_concurrent_queries: 50,
    
    // Team
    max_team_members: -1,               // Unlimited
    max_subdomains: -1,                 // Unlimited
    
    // Features
    features: {
      api_access: true,
      custom_branding: true,
      priority_support: true,
      dedicated_support: true,
      sla_guarantee: true,
      custom_integrations: true,
      premium_ai_models: true,          // Claude, GPT-4 included
      white_label: true,
      soc2_compliance: false,           // Roadmap
    },
    
    // Support
    support_response_time_hours: 4,
  },
  
  // ===== CUSTOM TIER (Contact Sales) =====
  [SUBSCRIPTION_TIERS.CUSTOM]: {
    monthly_price: -1,                  // Custom pricing
    
    // Documents
    max_documents_total: -1,            // Custom
    max_documents_per_month: -1,        // Custom
    max_concurrent_uploads: 50,
    max_file_size_mb: 500,
    
    // Queries
    max_queries_per_month: -1,          // Custom
    max_concurrent_queries: 100,
    
    // Team
    max_team_members: -1,               // Unlimited
    max_subdomains: -1,                 // Unlimited
    
    // Features
    features: {
      api_access: true,
      custom_branding: true,
      priority_support: true,
      dedicated_support: true,
      sla_guarantee: true,
      custom_integrations: true,
      premium_ai_models: true,
      white_label: true,
      soc2_compliance: true,
    },
    
    // Support
    support_response_time_hours: 1,     // 1-hour SLA
  },
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get limits for a specific tier
 */
export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_LIMITS[tier] || TIER_LIMITS.starter;
}

/**
 * Check if a tier has a specific feature
 */
export function hasTierFeature(
  tier: SubscriptionTier,
  feature: keyof TierLimits['features']
): boolean {
  const limits = getTierLimits(tier);
  return limits.features[feature];
}

/**
 * Check if value is unlimited (-1)
 */
export function isUnlimited(value: number): boolean {
  return value === -1;
}

/**
 * Check if tenant has reached a limit
 */
export function hasReachedLimit(current: number, max: number): boolean {
  if (isUnlimited(max)) return false;
  return current >= max;
}

/**
 * Calculate percentage of limit used
 */
export function calculateLimitPercentage(current: number, max: number): number {
  if (isUnlimited(max)) return 0;
  if (max === 0) return 100;
  return Math.min(Math.round((current / max) * 100), 100);
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: SubscriptionTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

/**
 * Get tier upgrade path
 */
export function getNextTier(currentTier: SubscriptionTier): SubscriptionTier | null {
  const tiers = Object.values(SUBSCRIPTION_TIERS);
  const currentIndex = tiers.indexOf(currentTier);
  if (currentIndex === -1 || currentIndex === tiers.length - 1) return null;
  return tiers[currentIndex + 1];
}

// =====================================================
// USAGE TYPES
// =====================================================

export interface TenantUsage {
  tenant_id: string;
  period_start: string;
  period_end: string;
  
  // Document usage
  documents_total: number;
  documents_this_month: number;
  storage_used_mb: number;
  
  // Query usage
  queries_this_month: number;
  
  // Team usage
  team_members_count: number;
  subdomains_count: number;
}

export interface LimitCheckResult {
  allowed: boolean;
  limit_type: string;
  current: number;
  max: number;
  percentage: number;
  message?: string;
}

