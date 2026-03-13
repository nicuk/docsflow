/**
 * Referral System
 * 
 * Handles referral code generation, tracking, and reward distribution.
 * "Hidden" = not advertised, but available for power users.
 */

// =====================================================
// REFERRAL TYPES
// =====================================================

export interface ReferralReward {
  referrer: {
    type: 'credit' | 'free_months' | 'cash' | 'upgrade';
    amount: number;
    description: string;
  };
  referee: {
    type: 'trial_extension' | 'discount' | 'credit';
    amount: number;
    description: string;
  };
}

export const REFERRAL_REWARDS: Record<string, ReferralReward> = {
  // Tier 1: Friend signs up
  signup: {
    referrer: {
      type: 'credit',
      amount: 50,
      description: '$50 credit toward your subscription',
    },
    referee: {
      type: 'trial_extension',
      amount: 30, // 30 extra days
      description: '60-day free trial (30 days extended)',
    },
  },

  // Tier 2: Friend converts to paid (any plan)
  conversion: {
    referrer: {
      type: 'free_months',
      amount: 3,
      description: '3 months free on your current plan',
    },
    referee: {
      type: 'discount',
      amount: 20, // 20% off
      description: '20% off first 3 months',
    },
  },

  // Tier 3: Friend buys annual plan
  annual: {
    referrer: {
      type: 'cash',
      amount: 500, // Cash or 6 months free
      description: '$500 cash or 6 months free',
    },
    referee: {
      type: 'discount',
      amount: 10, // Additional 10% off
      description: 'Additional 10% off annual price',
    },
  },

  // Tier 4: Friend upgrades to Enterprise
  enterprise: {
    referrer: {
      type: 'upgrade',
      amount: 50, // 50% off forever
      description: 'Lifetime 50% discount or $5,000 cash',
    },
    referee: {
      type: 'credit',
      amount: 1000,
      description: '$1,000 onboarding credit + dedicated support',
    },
  },
};

// =====================================================
// REFERRAL CODE GENERATION
// =====================================================

/**
 * Generate unique referral code for user
 * Format: FIRSTNAME-RANDOM (e.g., JOHN-X7K9)
 */
export function generateReferralCode(firstName: string): string {
  const sanitized = firstName
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .substring(0, 6) || 'USER';
  
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${sanitized}-${random}`;
}

/**
 * Get referral link for user
 */
export function getReferralLink(code: string, baseUrl: string = 'https://docsflow.ai'): string {
  return `${baseUrl}/signup?ref=${code}`;
}

// =====================================================
// REFERRAL TRACKING
// =====================================================

/**
 * Track new referral (when someone uses a referral code)
 */
export async function trackReferral(
  supabase: any,
  referralCode: string,
  refereeEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find referrer by code
    const { data: referrer, error: referrerError } = await supabase
      .from('users')
      .select('id, tenant_id, email')
      .eq('referral_code', referralCode)
      .single();

    if (referrerError || !referrer) {
      return { success: false, error: 'Invalid referral code' };
    }

    // Create referral record
    const { error: insertError } = await supabase
      .from('referrals')
      .insert({
        referrer_user_id: referrer.id,
        referrer_tenant_id: referrer.tenant_id,
        referee_email: refereeEmail,
        referral_code: referralCode,
        status: 'pending',
      });

    if (insertError) {
      return { success: false, error: 'Failed to track referral' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Update referral status and distribute rewards
 */
export async function processReferralReward(
  supabase: any,
  refereeEmail: string,
  rewardTier: keyof typeof REFERRAL_REWARDS
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get referral record
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .select('*, referrer:users!referrer_user_id(id, email, tenant_id)')
      .eq('referee_email', refereeEmail)
      .single();

    if (referralError || !referral) {
      return { success: true }; // No referral, that's OK
    }

    const reward = REFERRAL_REWARDS[rewardTier];

    // Update referral status
    await supabase
      .from('referrals')
      .update({
        status: rewardTier,
        reward_type: reward.referrer.type,
        reward_amount: reward.referrer.amount,
        converted_at: new Date().toISOString(),
      })
      .eq('id', referral.id);

    // Apply referrer reward
    if (reward.referrer.type === 'credit') {
      await applyAccountCredit(
        supabase,
        referral.referrer_tenant_id,
        reward.referrer.amount,
        `Referral reward: ${reward.referrer.description}`
      );
    } else if (reward.referrer.type === 'free_months') {
      await extendSubscription(
        supabase,
        referral.referrer_tenant_id,
        reward.referrer.amount,
        `Referral reward: ${reward.referrer.description}`
      );
    }

    // Send notification email
    await sendReferralRewardEmail(
      supabase,
      referral.referrer.email,
      reward.referrer.description
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to process reward' };
  }
}

// =====================================================
// REWARD DISTRIBUTION
// =====================================================

/**
 * Apply account credit to tenant
 */
async function applyAccountCredit(
  supabase: any,
  tenantId: string,
  amount: number,
  description: string
): Promise<void> {
  // Get or create account credits record
  const { data: existing } = await supabase
    .from('account_credits')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (existing) {
    await supabase
      .from('account_credits')
      .update({
        balance: existing.balance + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId);
  } else {
    await supabase
      .from('account_credits')
      .insert({
        tenant_id: tenantId,
        balance: amount,
        description,
      });
  }

  // Log transaction
  await supabase
    .from('credit_transactions')
    .insert({
      tenant_id: tenantId,
      amount,
      type: 'credit',
      description,
    });
}

/**
 * Extend subscription by X months
 */
async function extendSubscription(
  supabase: any,
  tenantId: string,
  months: number,
  description: string
): Promise<void> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (subscription) {
    const currentEnd = new Date(subscription.current_period_end);
    const newEnd = new Date(currentEnd);
    newEnd.setMonth(newEnd.getMonth() + months);

    await supabase
      .from('subscriptions')
      .update({
        current_period_end: newEnd.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId);
  }
}

/**
 * Send reward notification email
 */
async function sendReferralRewardEmail(
  supabase: any,
  email: string,
  rewardDescription: string
): Promise<void> {
  // TODO: Implement email notification
}

// =====================================================
// STATS & LEADERBOARD
// =====================================================

/**
 * Get referral stats for user
 */
export async function getReferralStats(
  supabase: any,
  userId: string
): Promise<{
  totalReferrals: number;
  conversions: number;
  earnings: number;
  pendingRewards: number;
}> {
  const { data: referrals } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_user_id', userId);

  if (!referrals) {
    return { totalReferrals: 0, conversions: 0, earnings: 0, pendingRewards: 0 };
  }

  const conversions = referrals.filter(r => r.status !== 'pending').length;
  const earnings = referrals
    .filter(r => r.reward_amount)
    .reduce((sum, r) => sum + (r.reward_amount || 0), 0);
  const pendingRewards = referrals.filter(r => r.status === 'pending').length;

  return {
    totalReferrals: referrals.length,
    conversions,
    earnings,
    pendingRewards,
  };
}

/**
 * Get top referrers (for admin/leaderboard)
 */
export async function getTopReferrers(
  supabase: any,
  limit: number = 10
): Promise<Array<{
  userId: string;
  email: string;
  referralCount: number;
  conversions: number;
  totalEarnings: number;
}>> {
  const { data: topReferrers } = await supabase
    .from('referrals')
    .select(`
      referrer_user_id,
      referrer:users!referrer_user_id(email),
      reward_amount
    `);

  if (!topReferrers) return [];

  // Aggregate by referrer
  const stats = new Map<string, any>();
  
  topReferrers.forEach(ref => {
    const userId = ref.referrer_user_id;
    if (!stats.has(userId)) {
      stats.set(userId, {
        userId,
        email: ref.referrer?.email || 'Unknown',
        referralCount: 0,
        conversions: 0,
        totalEarnings: 0,
      });
    }
    
    const userStats = stats.get(userId);
    userStats.referralCount++;
    if (ref.reward_amount) {
      userStats.conversions++;
      userStats.totalEarnings += ref.reward_amount;
    }
  });

  return Array.from(stats.values())
    .sort((a, b) => b.conversions - a.conversions)
    .slice(0, limit);
}

