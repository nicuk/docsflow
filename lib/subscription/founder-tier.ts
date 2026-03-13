/**
 * Founder's Lifetime Deal Configuration
 * 
 * Special tier with usage caps to prevent abuse while providing
 * great value to normal users.
 */

import { TierLimits } from './tiers';

// =====================================================
// FOUNDER'S TIER DEFINITION
// =====================================================

export const FOUNDERS_TIER: TierLimits = {
  // One-time pricing
  monthly_price: -1, // Special: $2,999 one-time
  
  // Base limits (same as Professional)
  max_documents_total: 5_000,
  max_documents_per_month: 1_500,
  max_concurrent_uploads: 10,
  max_file_size_mb: 50,
  
  // Query limits (same as Professional)
  max_queries_per_month: 40_000,
  max_concurrent_queries: 10,
  
  // Team limits
  max_team_members: -1, // Unlimited
  max_subdomains: 5,
  
  // Features (Professional + extras)
  features: {
    api_access: true,
    custom_branding: true,
    priority_support: true,
    dedicated_support: false,
    sla_guarantee: false,
    custom_integrations: false,
    premium_ai_models: false,
    white_label: true,
    soc2_compliance: false,
  },
  
  // Support
  support_response_time_hours: 24,
};

// =====================================================
// FAIR USE POLICY (AUTOMATIC UPGRADE TRIGGERS)
// =====================================================

export interface FairUseThresholds {
  // If user exceeds ANY of these for 3 consecutive months:
  // → Auto-upgrade to Enterprise at 50% off
  consecutive_months_threshold: 3;
  
  thresholds: {
    queries_per_month: number;      // 150% of normal limit
    documents_total: number;         // 200% of normal limit
    storage_mb: number;              // Custom threshold
    api_calls_per_day: number;       // For API abuse
  };
  
  upgrade_action: {
    new_tier: 'enterprise';
    discount_percentage: 50;        // 50% off Enterprise = $1,099/mo
    credit_applied: number;          // $2,999 credited over 3 months
    effective_cost_first_3_months: number; // ($1,099 × 3) - $2,999 = net $298
  };
}

export const FOUNDERS_FAIR_USE: FairUseThresholds = {
  consecutive_months_threshold: 3,
  
  thresholds: {
    // 150% of Professional limits
    queries_per_month: 60_000,      // vs 40K normal
    documents_total: 10_000,         // vs 5K normal
    storage_mb: 5_000,               // ~5GB vs 2.5GB normal
    api_calls_per_day: 5_000,        // Prevent API abuse
  },
  
  upgrade_action: {
    new_tier: 'enterprise',
    discount_percentage: 50,
    credit_applied: 2999,
    effective_cost_first_3_months: 298, // Essentially 3 months for $298
  },
};

// =====================================================
// USAGE MONITORING
// =====================================================

export interface FounderUsageStatus {
  tenant_id: string;
  current_month_usage: {
    queries: number;
    documents: number;
    storage_mb: number;
    api_calls: number;
  };
  
  // Track consecutive months over threshold
  consecutive_months_over_threshold: number;
  months_over_threshold: Array<{
    month: string;
    exceeded_thresholds: string[]; // ['queries', 'storage']
  }>;
  
  // Warnings
  warning_level: 'none' | 'notice' | 'warning' | 'final_warning';
  upgrade_scheduled: boolean;
  upgrade_date?: string;
}

/**
 * Check if Founder tier user is exceeding fair use
 */
export function checkFounderFairUse(usage: FounderUsageStatus): {
  within_limits: boolean;
  exceeded_thresholds: string[];
  warning_message?: string;
  action_required?: string;
} {
  const exceeded: string[] = [];
  
  // Check each threshold
  if (usage.current_month_usage.queries > FOUNDERS_FAIR_USE.thresholds.queries_per_month) {
    exceeded.push('queries');
  }
  if (usage.current_month_usage.documents > FOUNDERS_FAIR_USE.thresholds.documents_total) {
    exceeded.push('documents');
  }
  if (usage.current_month_usage.storage_mb > FOUNDERS_FAIR_USE.thresholds.storage_mb) {
    exceeded.push('storage');
  }
  if (usage.current_month_usage.api_calls > FOUNDERS_FAIR_USE.thresholds.api_calls_per_day * 30) {
    exceeded.push('api_calls');
  }
  
  // If nothing exceeded, all good
  if (exceeded.length === 0) {
    return { within_limits: true, exceeded_thresholds: [] };
  }
  
  // Check consecutive months
  const consecutive = usage.consecutive_months_over_threshold;
  
  if (consecutive >= 3) {
    return {
      within_limits: false,
      exceeded_thresholds: exceeded,
      warning_message: 'You have exceeded fair use limits for 3 consecutive months.',
      action_required: 'AUTO_UPGRADE_TO_ENTERPRISE',
    };
  } else if (consecutive === 2) {
    return {
      within_limits: false,
      exceeded_thresholds: exceeded,
      warning_message: `Final Warning: You have exceeded limits for 2 months. One more month and you'll be upgraded to Enterprise tier at 50% off ($1,099/mo). Your $2,999 will be credited.`,
    };
  } else if (consecutive === 1) {
    return {
      within_limits: false,
      exceeded_thresholds: exceeded,
      warning_message: `Notice: You exceeded fair use limits this month. If this continues for 2 more months, you'll be upgraded to Enterprise tier.`,
    };
  }
  
  return { within_limits: true, exceeded_thresholds: [] };
}

// =====================================================
// FOUNDER'S BENEFITS
// =====================================================

export interface FounderBenefits {
  // Badge on profile
  founder_badge: true;
  
  // Special perks
  perks: {
    priority_feature_requests: boolean;
    early_beta_access: boolean;
    quarterly_founder_calls: boolean;
    listed_on_founders_page: boolean; // Optional: User can opt-in
  };
  
  // Grandfathered pricing
  pricing: {
    one_time_payment: 2999;
    lifetime_access: true;
    no_recurring_charges: true;
    fair_use_policy_applies: true;
  };
}

export const FOUNDER_BENEFITS: FounderBenefits = {
  founder_badge: true,
  
  perks: {
    priority_feature_requests: true,
    early_beta_access: true,
    quarterly_founder_calls: true,
    listed_on_founders_page: true,
  },
  
  pricing: {
    one_time_payment: 2999,
    lifetime_access: true,
    no_recurring_charges: true,
    fair_use_policy_applies: true,
  },
};

// =====================================================
// EMAIL NOTIFICATIONS
// =====================================================

export const FOUNDER_NOTIFICATION_TEMPLATES = {
  first_month_exceeded: {
    subject: '📊 Notice: You exceeded fair use limits this month',
    body: `Hi there,

We noticed you exceeded the fair use thresholds this month on your Founder's Lifetime plan:

{exceeded_list}

This is just a friendly notice. Your Founder's plan includes generous limits (150% of Professional tier), and most users stay well within them.

If you consistently exceed these limits for 3 consecutive months, we'll need to upgrade you to Enterprise tier to ensure sustainable service quality.

Current status: Month 1 of 3

Don't worry - you're still on track! This is normal for power users exploring the platform.

Questions? Reply to this email.

Best,
The DocsFlow Team`,
  },
  
  second_month_exceeded: {
    subject: '⚠️ Warning: 2nd consecutive month exceeding fair use',
    body: `Hi there,

This is your 2nd consecutive month exceeding fair use thresholds on your Founder's plan:

{exceeded_list}

If this continues for one more month (3 total), you'll be automatically upgraded to Enterprise tier at 50% off ($1,099/mo instead of $2,199/mo).

The good news:
✅ Your $2,999 will be credited toward first 3 months
✅ Net cost: Only $298 for 3 months of Enterprise
✅ You get unlimited queries, 25K docs, dedicated support

Want to avoid the upgrade? Reduce usage below these thresholds:
• 60,000 queries/month
• 10,000 documents
• 5GB storage

Questions? Let's chat: {calendly_link}

Best,
The DocsFlow Team`,
  },
  
  final_warning: {
    subject: '🚨 Final Warning: Automatic upgrade in 30 days',
    body: `Hi there,

You've exceeded fair use limits for 3 consecutive months. Your Founder's plan will be upgraded to Enterprise tier on {upgrade_date}.

New billing (Enterprise 50% off):
• Price: $1,099/month (vs $2,199 regular)
• Credit: $2,999 applied to first 3 months
• Net: $298 for first 3 months
• After 3 months: $1,099/month ongoing

What you get:
✅ 25,000 documents (vs 5,000)
✅ 150,000 queries/month (vs 40,000)
✅ Unlimited storage
✅ Dedicated support (4-hour response)
✅ Premium AI models included
✅ Forever 50% off (locked in)

This upgrade ensures we can sustainably support your high usage while giving you room to grow.

Want to discuss? Book a call: {calendly_link}

Best,
The DocsFlow Team`,
  },
};

// =====================================================
// COST PROTECTION ANALYSIS
// =====================================================

export interface CostProtectionMetrics {
  // What percentage of Founders will hit limits?
  projected_upgrade_rate: number; // 10% = 10 out of 100
  
  // Financial impact
  scenario_100_founders: {
    upfront_revenue: number;
    monthly_cost_year_1: number;
    monthly_cost_year_5: number;
    power_users_upgraded: number; // 10 out of 100
    light_users_remaining: number; // 90 out of 100
    net_monthly_cost_year_5: number;
    new_revenue_from_upgrades: number; // 10 × $1,099/mo
  };
}

export const COST_PROTECTION: CostProtectionMetrics = {
  projected_upgrade_rate: 0.10, // 10% of Founders are power users
  
  scenario_100_founders: {
    upfront_revenue: 299_900, // 100 × $2,999
    
    monthly_cost_year_1: 6_200, // 100 × $62 avg
    monthly_cost_year_5: 8_300, // 90 light users × $45 + 10 power × $88
    
    power_users_upgraded: 10,
    light_users_remaining: 90,
    
    net_monthly_cost_year_5: 8_300, // Before upgrades
    new_revenue_from_upgrades: 10_990, // 10 × $1,099/mo
    
    // NET RESULT: +$2,690/month profit from upgrades
    // This offsets the 90 remaining Founders costing $8,300/mo
    // You're only losing $5,610/mo on 90 light users (manageable)
  },
};

/**
 * Calculate if Founder's deal is sustainable with fair use policy
 */
export function calculateFounderSustainability(
  num_founders: number,
  years: number
): {
  total_revenue: number;
  total_costs: number;
  upgrade_revenue: number;
  net_result: number;
  sustainable: boolean;
} {
  const upfront = num_founders * 2999;
  
  // 10% upgrade after year 2
  const power_users = Math.floor(num_founders * 0.10);
  const light_users = num_founders - power_users;
  
  // Costs (first 2 years: all Founders, after: only light users)
  const monthly_cost_years_1_2 = num_founders * 62; // Average
  const monthly_cost_years_3_plus = light_users * 45; // Light users only
  
  const costs_years_1_2 = monthly_cost_years_1_2 * 12 * 2; // 2 years
  const costs_years_3_plus = monthly_cost_years_3_plus * 12 * (years - 2);
  const total_costs = costs_years_1_2 + costs_years_3_plus;
  
  // Revenue from upgrades (10% convert at year 3)
  const upgrade_revenue = power_users * 1099 * 12 * (years - 2);
  
  const net_result = upfront + upgrade_revenue - total_costs;
  
  return {
    total_revenue: upfront,
    total_costs,
    upgrade_revenue,
    net_result,
    sustainable: net_result > 0,
  };
}
