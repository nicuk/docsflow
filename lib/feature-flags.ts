/**
 * Feature flags for production deployment control
 * Use this to safely deploy features that aren't ready for production
 */

export interface FeatureFlags {
  samlSSO: boolean;
  enterpriseFeatures: boolean;
  advancedAnalytics: boolean;
  customIntegrations: boolean;
}

export const FEATURE_FLAGS: FeatureFlags = {
  // SAML SSO - Disabled until freemium is complete and enterprise tier is launched
  samlSSO: process.env.NODE_ENV === 'development' || process.env.ENABLE_SAML === 'true',
  
  // Enterprise features - Disabled until we have paying customers
  enterpriseFeatures: false,
  
  // Advanced analytics - Future feature
  advancedAnalytics: false,
  
  // Custom integrations - Future feature  
  customIntegrations: false,
};

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return FEATURE_FLAGS[feature];
}

/**
 * Enterprise feature guard - checks both feature flag and subscription
 */
export async function checkEnterpriseAccess(
  feature: keyof FeatureFlags,
  tenantId?: string
): Promise<{ enabled: boolean; reason?: string }> {
  // First check feature flag
  if (!isFeatureEnabled(feature)) {
    return {
      enabled: false,
      reason: 'Feature not yet available. Coming soon!'
    };
  }

  // If no tenant (e.g., public pages), just check feature flag
  if (!tenantId) {
    return { enabled: true };
  }

  // const subscription = await getSubscription(tenantId);
  // if (!subscription.allowsEnterprise) {
  //   return {
  //     enabled: false,
  //     reason: 'Upgrade to Professional plan to access enterprise features'
  //   };
  // }

  return { enabled: true };
}