import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getPlanDetails } from './tenant-limits';

export interface UsageLimits {
  documentLimit: number | 'unlimited';
  conversationLimit: number | 'unlimited';
  storageLimit: number | 'unlimited'; // in MB
  userLimit: number | 'unlimited';
  subdomainLimit: number | 'unlimited';
}

export interface UsageCheck {
  allowed: boolean;
  current: number;
  limit: number | 'unlimited';
  upgradeRequired?: boolean;
  resetDate?: Date;
  message?: string;
}

// Plan limits configuration - extends your existing tenant-limits.ts
const PLAN_LIMITS: Record<string, UsageLimits> = {
  free: {
    documentLimit: 5,
    conversationLimit: 50,
    storageLimit: 100, // 100MB
    userLimit: 1,
    subdomainLimit: 1,
  },
  starter: {
    documentLimit: 50,
    conversationLimit: 500,
    storageLimit: 1000, // 1GB
    userLimit: 5,
    subdomainLimit: 1,
  },
  professional: {
    documentLimit: 500,
    conversationLimit: 5000,
    storageLimit: 10000, // 10GB
    userLimit: 25,
    subdomainLimit: 5,
  },
  enterprise: {
    documentLimit: 'unlimited',
    conversationLimit: 'unlimited',
    storageLimit: 100000, // 100GB
    userLimit: 100,
    subdomainLimit: 'unlimited',
  },
  unlimited: {
    documentLimit: 'unlimited',
    conversationLimit: 'unlimited',
    storageLimit: 'unlimited',
    userLimit: 'unlimited',
    subdomainLimit: 'unlimited',
  },
};

function getSupabaseClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );
}

// Main enforcement function
export async function enforceSubscriptionLimits(
  tenantId: string,
  action: 'document_upload' | 'conversation' | 'user_invite' | 'subdomain_create'
): Promise<UsageCheck> {
  try {
    const supabase = getSupabaseClient();

    // Get tenant plan
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('plan_type, subscription_status')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return {
        allowed: false,
        current: 0,
        limit: 0,
        message: 'Tenant not found',
      };
    }

    // Check if subscription is active
    if (tenant.subscription_status !== 'active' && tenant.plan_type !== 'free') {
      return {
        allowed: false,
        current: 0,
        limit: 0,
        upgradeRequired: true,
        message: 'Subscription required. Please upgrade your plan.',
      };
    }

    const planLimits = PLAN_LIMITS[tenant.plan_type] || PLAN_LIMITS.free;

    // Route to specific limit check
    switch (action) {
      case 'document_upload':
        return await checkDocumentLimit(tenantId, planLimits.documentLimit, supabase);
      case 'conversation':
        return await checkConversationLimit(tenantId, planLimits.conversationLimit, supabase);
      case 'user_invite':
        return await checkUserLimit(tenantId, planLimits.userLimit, supabase);
      case 'subdomain_create':
        return await checkSubdomainLimit(tenantId, planLimits.subdomainLimit, supabase);
      default:
        return {
          allowed: false,
          current: 0,
          limit: 0,
          message: 'Invalid action type',
        };
    }
  } catch (error) {
    console.error('Error enforcing subscription limits:', error);
    return {
      allowed: false,
      current: 0,
      limit: 0,
      message: 'Error checking limits',
    };
  }
}

async function checkDocumentLimit(
  tenantId: string,
  limit: number | 'unlimited',
  supabase: any
): Promise<UsageCheck> {
  if (limit === 'unlimited') {
    return { allowed: true, current: 0, limit: 'unlimited' };
  }

  const { data, error } = await supabase
    .from('documents')
    .select('id')
    .eq('tenant_id', tenantId)
    .neq('processing_status', 'error');

  if (error) {
    console.error('Error checking document limit:', error);
    return {
      allowed: false,
      current: 0,
      limit,
      message: 'Error checking document limit',
    };
  }

  const current = data?.length || 0;
  const allowed = current < limit;

  return {
    allowed,
    current,
    limit,
    upgradeRequired: !allowed,
    message: allowed
      ? undefined
      : `Document limit reached (${current}/${limit}). Upgrade to upload more documents.`,
  };
}

async function checkConversationLimit(
  tenantId: string,
  limit: number | 'unlimited',
  supabase: any
): Promise<UsageCheck> {
  if (limit === 'unlimited') {
    return { allowed: true, current: 0, limit: 'unlimited' };
  }

  // Get current month's conversation count
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('chat_conversations')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('created_at', startOfMonth.toISOString());

  if (error) {
    console.error('Error checking conversation limit:', error);
    return {
      allowed: false,
      current: 0,
      limit,
      message: 'Error checking conversation limit',
    };
  }

  const current = data?.length || 0;
  const allowed = current < limit;

  // Calculate next reset date
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  nextMonth.setHours(0, 0, 0, 0);

  return {
    allowed,
    current,
    limit,
    upgradeRequired: !allowed,
    resetDate: nextMonth,
    message: allowed
      ? undefined
      : `Monthly conversation limit reached (${current}/${limit}). Resets on ${nextMonth.toLocaleDateString()}.`,
  };
}

async function checkUserLimit(
  tenantId: string,
  limit: number | 'unlimited',
  supabase: any
): Promise<UsageCheck> {
  if (limit === 'unlimited') {
    return { allowed: true, current: 0, limit: 'unlimited' };
  }

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error checking user limit:', error);
    return {
      allowed: false,
      current: 0,
      limit,
      message: 'Error checking user limit',
    };
  }

  const current = data?.length || 0;
  const allowed = current < limit;

  return {
    allowed,
    current,
    limit,
    upgradeRequired: !allowed,
    message: allowed
      ? undefined
      : `User limit reached (${current}/${limit}). Upgrade to add more users.`,
  };
}

async function checkSubdomainLimit(
  tenantId: string,
  limit: number | 'unlimited',
  supabase: any
): Promise<UsageCheck> {
  if (limit === 'unlimited') {
    return { allowed: true, current: 0, limit: 'unlimited' };
  }

  // For subdomain limits, we need to check by user email since one email can have multiple subdomains
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .eq('id', tenantId)
    .single();

  if (tenantError) {
    return {
      allowed: false,
      current: 0,
      limit,
      message: 'Error checking subdomain limit',
    };
  }

  // For now, assume 1 tenant = 1 subdomain
  // In a multi-subdomain system, you'd need to track by user email
  return {
    allowed: true,
    current: 1,
    limit,
  };
}

// Usage tracking function
export async function trackUsage(
  tenantId: string,
  action: 'document_upload' | 'conversation' | 'storage_used',
  amount: number = 1
): Promise<void> {
  try {
    const supabase = getSupabaseClient();

    // Get current month period
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Upsert usage tracking record
    const { error } = await supabase
      .from('usage_tracking')
      .upsert({
        tenant_id: tenantId,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        [`${action.replace('_upload', '').replace('_used', '')}_count`]: amount,
      }, {
        onConflict: 'tenant_id,period_start,period_end',
      });

    if (error) {
      console.error('Error tracking usage:', error);
    }
  } catch (error) {
    console.error('Error in trackUsage:', error);
  }
}

// Get current usage for dashboard
export async function getCurrentUsage(tenantId: string): Promise<{
  documents: number;
  conversations: number;
  storage: number;
  users: number;
}> {
  try {
    const supabase = getSupabaseClient();

    // Get document count
    const { data: documents } = await supabase
      .from('documents')
      .select('id')
      .eq('tenant_id', tenantId)
      .neq('processing_status', 'error');

    // Get current month's conversation count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: conversations } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('tenant_id', tenantId)
      .gte('created_at', startOfMonth.toISOString());

    // Get user count
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', tenantId);

    // Get storage usage (sum of document file sizes)
    const { data: storageData } = await supabase
      .from('documents')
      .select('file_size')
      .eq('tenant_id', tenantId);

    const storageBytes = storageData?.reduce((sum, doc) => sum + (doc.file_size || 0), 0) || 0;
    const storageMB = Math.round(storageBytes / (1024 * 1024));

    return {
      documents: documents?.length || 0,
      conversations: conversations?.length || 0,
      storage: storageMB,
      users: users?.length || 0,
    };
  } catch (error) {
    console.error('Error getting current usage:', error);
    return {
      documents: 0,
      conversations: 0,
      storage: 0,
      users: 0,
    };
  }
}

