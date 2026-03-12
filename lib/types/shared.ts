/**
 * CANONICAL TYPE DEFINITIONS FOR MONOREPO
 * Source of Truth: Frontend-Data-Intelligence (Working Implementation)
 * 
 * MIGRATION STRATEGY: Clean Slate Approach
 * - Frontend types are canonical and immutable
 * - Backend must adapt to serve these contracts exactly
 * - No backend type conflicts allowed
 */

export interface SubdomainData {
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

export interface TenantSettings {
  displayName?: string;
  contactEmail?: string;
  aiEnabled?: boolean;
  notifications?: boolean;
  description?: string;
}

export interface OnboardingData {
  displayName?: string;
  subdomain?: string;
  isNewTenant?: boolean;
  userRole?: string;
  business_overview?: string;
  daily_challenges?: string;
  key_decisions?: string;
  success_metrics?: string;
  information_needs?: string;
}

export interface UserData {
  id: string;
  email: string;
  name?: string;
  tenant_id?: string;
  role?: string;
  access_level?: number;
  onboarding_complete?: boolean;
}

export interface TenantData {
  id: string;
  subdomain: string;
  name: string;
  displayName?: string;
  industry?: string;
  subscription_status?: string;
  plan_type?: string;
  created_at?: string;
  settings?: Record<string, any>;
  theme?: Record<string, any>;
}

// 🚫 DEPRECATED: Backend legacy types - DO NOT USE
// These will be systematically removed
export interface LegacyTenantSettings {

  contactEmail?: string;
  displayName?: string;
  aiEnabled?: boolean;
}
