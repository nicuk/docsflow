import { supabase } from './supabase';

// Subscription plan configurations
export interface SubscriptionPlan {
  id: string;
  name: string;
  userLimit: number;
  features: string[];
  pricePerMonth: number;
  description: string;
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    userLimit: 5,
    features: [
      'Up to 5 users',
      'Basic document intelligence',
      'Email support',
      'Access levels 1-2',
      '1GB storage'
    ],
    pricePerMonth: 29,
    description: 'Perfect for small teams getting started'
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    userLimit: 25,
    features: [
      'Up to 25 users',
      'Advanced document intelligence',
      'Priority support',
      'Access levels 1-4',
      'External integrations (Google Drive, OneDrive)',
      '10GB storage',
      'Advanced analytics'
    ],
    pricePerMonth: 99,
    description: 'Ideal for growing businesses with advanced needs'
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    userLimit: 100,
    features: [
      'Up to 100 users',
      'Full document intelligence suite',
      'Dedicated support',
      'All access levels (1-5)',
      'All external integrations',
      'Unlimited storage',
      'Custom AI models',
      'API access',
      'White-label options'
    ],
    pricePerMonth: 299,
    description: 'For large organizations with enterprise requirements'
  },
  unlimited: {
    id: 'unlimited',
    name: 'Unlimited',
    userLimit: 1000,
    features: [
      'Unlimited users',
      'Everything in Enterprise',
      'Custom development',
      'On-premise deployment',
      'SLA guarantees',
      'Custom integrations'
    ],
    pricePerMonth: 999,
    description: 'For enterprise customers with unlimited scaling needs'
  }
};

// Get plan details
export function getPlanDetails(planType: string): SubscriptionPlan {
  return SUBSCRIPTION_PLANS[planType] || SUBSCRIPTION_PLANS.starter;
}

// Check if a tenant can add more users
export async function checkTenantUserLimits(tenantId: string): Promise<{
  success: boolean;
  current: number;
  limit: number;
  remaining: number;
  canAddUser: boolean;
  plan: SubscriptionPlan;
  error?: string;
}> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    // Get tenant information
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, plan_type, user_limit, subscription_status')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return {
        success: false,
        current: 0,
        limit: 0,
        remaining: 0,
        canAddUser: false,
        plan: SUBSCRIPTION_PLANS.starter,
        error: 'Tenant not found'
      };
    }

    // Check if subscription is active
    if (tenant.subscription_status !== 'active') {
      return {
        success: false,
        current: 0,
        limit: 0,
        remaining: 0,
        canAddUser: false,
        plan: getPlanDetails(tenant.plan_type),
        error: `Subscription is ${tenant.subscription_status}. Please contact support.`
      };
    }

    // Get current user count
    const { data: userCount, error: countError } = await supabase
      .rpc('check_user_limit', { tenant_uuid: tenantId });

    if (countError) {
      console.error('Error checking user limit:', countError);
      return {
        success: false,
        current: 0,
        limit: tenant.user_limit,
        remaining: 0,
        canAddUser: false,
        plan: getPlanDetails(tenant.plan_type),
        error: 'Failed to check user limits'
      };
    }

    const { current_users, user_limit, can_add_user } = userCount[0];
    const plan = getPlanDetails(tenant.plan_type);

    return {
      success: true,
      current: current_users,
      limit: user_limit,
      remaining: user_limit - current_users,
      canAddUser: can_add_user,
      plan
    };

  } catch (error) {
    console.error('Error in checkTenantUserLimits:', error);
    return {
      success: false,
      current: 0,
      limit: 0,
      remaining: 0,
      canAddUser: false,
      plan: SUBSCRIPTION_PLANS.starter,
      error: 'Internal error checking user limits'
    };
  }
}

// Update tenant plan and user limits
export async function updateTenantPlan(
  tenantId: string, 
  newPlanType: string
): Promise<{ success: boolean; error?: string; plan?: SubscriptionPlan }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const plan = getPlanDetails(newPlanType);
    
    if (!SUBSCRIPTION_PLANS[newPlanType]) {
      return {
        success: false,
        error: 'Invalid plan type'
      };
    }

    // Update tenant plan and user limit
    const { error } = await supabase
      .from('tenants')
      .update({
        plan_type: newPlanType,
        user_limit: plan.userLimit,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenantId);

    if (error) {
      console.error('Error updating tenant plan:', error);
      return {
        success: false,
        error: 'Failed to update plan'
      };
    }

    // Log analytics event
    await supabase
      .from('analytics_events')
      .insert({
        tenant_id: tenantId,
        event_type: 'plan_updated',
        event_data: {
          new_plan: newPlanType,
          new_user_limit: plan.userLimit,
          timestamp: new Date().toISOString()
        }
      });

    return {
      success: true,
      plan
    };

  } catch (error) {
    console.error('Error in updateTenantPlan:', error);
    return {
      success: false,
      error: 'Internal error updating plan'
    };
  }
}

// Get plan upgrade/downgrade options
export function getPlanUpgradeOptions(currentPlan: string): SubscriptionPlan[] {
  const planOrder = ['starter', 'professional', 'enterprise', 'unlimited'];
  const currentIndex = planOrder.indexOf(currentPlan);
  
  if (currentIndex === -1) return Object.values(SUBSCRIPTION_PLANS);
  
  // Return plans that are upgrades (higher index)
  return planOrder.slice(currentIndex + 1).map(planId => SUBSCRIPTION_PLANS[planId]);
}

export function getPlanDowngradeOptions(currentPlan: string): SubscriptionPlan[] {
  const planOrder = ['starter', 'professional', 'enterprise', 'unlimited'];
  const currentIndex = planOrder.indexOf(currentPlan);
  
  if (currentIndex === -1) return [];
  
  // Return plans that are downgrades (lower index)
  return planOrder.slice(0, currentIndex).map(planId => SUBSCRIPTION_PLANS[planId]);
}

// Validate if a tenant can downgrade (check if current user count fits in new plan)
export async function validatePlanDowngrade(
  tenantId: string, 
  newPlanType: string
): Promise<{ canDowngrade: boolean; currentUsers: number; newLimit: number; error?: string }> {
  try {
    const limits = await checkTenantUserLimits(tenantId);
    const newPlan = getPlanDetails(newPlanType);
    
    if (!limits.success) {
      return {
        canDowngrade: false,
        currentUsers: 0,
        newLimit: newPlan.userLimit,
        error: limits.error
      };
    }

    const canDowngrade = limits.current <= newPlan.userLimit;
    
    return {
      canDowngrade,
      currentUsers: limits.current,
      newLimit: newPlan.userLimit,
      error: canDowngrade 
        ? undefined 
        : `Cannot downgrade: You have ${limits.current} users but the ${newPlan.name} plan only allows ${newPlan.userLimit} users. Please remove ${limits.current - newPlan.userLimit} users first.`
    };

  } catch (error) {
    console.error('Error validating plan downgrade:', error);
    return {
      canDowngrade: false,
      currentUsers: 0,
      newLimit: 0,
      error: 'Failed to validate downgrade'
    };
  }
}

// Calculate prorated billing for plan changes
export function calculateProratedBilling(
  currentPlan: string,
  newPlan: string,
  daysRemainingInBilling: number
): {
  currentPlanCredit: number;
  newPlanCharge: number;
  totalAdjustment: number;
  description: string;
} {
  const current = getPlanDetails(currentPlan);
  const newPlanDetails = getPlanDetails(newPlan);
  
  const dailyCurrentRate = current.pricePerMonth / 30;
  const dailyNewRate = newPlanDetails.pricePerMonth / 30;
  
  const currentPlanCredit = dailyCurrentRate * daysRemainingInBilling;
  const newPlanCharge = dailyNewRate * daysRemainingInBilling;
  const totalAdjustment = newPlanCharge - currentPlanCredit;
  
  const description = totalAdjustment >= 0
    ? `Upgrade charge: $${totalAdjustment.toFixed(2)} for remaining ${daysRemainingInBilling} days`
    : `Downgrade credit: $${Math.abs(totalAdjustment).toFixed(2)} for remaining ${daysRemainingInBilling} days`;
  
  return {
    currentPlanCredit,
    newPlanCharge,
    totalAdjustment,
    description
  };
} 