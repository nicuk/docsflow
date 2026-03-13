/**
 * Limit Checker
 * 
 * Validates if tenants can perform actions based on their subscription tier.
 * Used by API routes to enforce limits before processing requests.
 */

import { createClient } from '@supabase/supabase-js';
import {
  SubscriptionTier,
  getTierLimits,
  hasReachedLimit,
  calculateLimitPercentage,
  type TenantUsage,
  type LimitCheckResult,
} from './tiers';

// =====================================================
// LIMIT CHECKER CLASS
// =====================================================

export class LimitChecker {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Get current usage for a tenant
   */
  async getTenantUsage(tenantId: string): Promise<TenantUsage> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get usage from usage_tracking table
    const { data: usageData, error: usageError } = await this.supabase
      .from('usage_tracking')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('period_start', periodStart.toISOString())
      .lte('period_end', periodEnd.toISOString())
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      // Usage fetch error (non-empty result expected)
    }

    // Get total documents count
    const { count: totalDocuments } = await this.supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    // Get team members count
    const { count: teamMembers } = await this.supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    return {
      tenant_id: tenantId,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      documents_total: totalDocuments || 0,
      documents_this_month: usageData?.documents_count || 0,
      storage_used_mb: usageData?.storage_used_mb || 0,
      queries_this_month: usageData?.conversations_count || 0, // Using conversations as proxy
      team_members_count: teamMembers || 0,
      subdomains_count: 1,
    };
  }

  /**
   * Check if tenant can upload more documents
   */
  async canUploadDocuments(
    tenantId: string,
    tier: SubscriptionTier,
    uploadCount: number = 1
  ): Promise<LimitCheckResult> {
    const limits = getTierLimits(tier);
    const usage = await this.getTenantUsage(tenantId);

    // Check total documents limit
    if (hasReachedLimit(usage.documents_total + uploadCount, limits.max_documents_total)) {
      return {
        allowed: false,
        limit_type: 'max_documents_total',
        current: usage.documents_total,
        max: limits.max_documents_total,
        percentage: calculateLimitPercentage(usage.documents_total, limits.max_documents_total),
        message: `You've reached your total document limit (${limits.max_documents_total}). Upgrade to upload more.`,
      };
    }

    // Check monthly documents limit
    if (hasReachedLimit(usage.documents_this_month + uploadCount, limits.max_documents_per_month)) {
      return {
        allowed: false,
        limit_type: 'max_documents_per_month',
        current: usage.documents_this_month,
        max: limits.max_documents_per_month,
        percentage: calculateLimitPercentage(usage.documents_this_month, limits.max_documents_per_month),
        message: `You've reached your monthly document limit (${limits.max_documents_per_month}). Limit resets next month.`,
      };
    }

    return {
      allowed: true,
      limit_type: 'documents',
      current: usage.documents_total,
      max: limits.max_documents_total,
      percentage: calculateLimitPercentage(usage.documents_total, limits.max_documents_total),
    };
  }

  /**
   * Check if tenant can make queries
   */
  async canMakeQuery(tenantId: string, tier: SubscriptionTier): Promise<LimitCheckResult> {
    const limits = getTierLimits(tier);
    const usage = await this.getTenantUsage(tenantId);

    if (hasReachedLimit(usage.queries_this_month, limits.max_queries_per_month)) {
      return {
        allowed: false,
        limit_type: 'max_queries_per_month',
        current: usage.queries_this_month,
        max: limits.max_queries_per_month,
        percentage: calculateLimitPercentage(usage.queries_this_month, limits.max_queries_per_month),
        message: `You've reached your monthly query limit (${limits.max_queries_per_month}). Upgrade for more queries.`,
      };
    }

    return {
      allowed: true,
      limit_type: 'queries',
      current: usage.queries_this_month,
      max: limits.max_queries_per_month,
      percentage: calculateLimitPercentage(usage.queries_this_month, limits.max_queries_per_month),
    };
  }

  /**
   * Check if tenant can add team members
   */
  async canAddTeamMember(tenantId: string, tier: SubscriptionTier): Promise<LimitCheckResult> {
    const limits = getTierLimits(tier);
    const usage = await this.getTenantUsage(tenantId);

    if (hasReachedLimit(usage.team_members_count, limits.max_team_members)) {
      return {
        allowed: false,
        limit_type: 'max_team_members',
        current: usage.team_members_count,
        max: limits.max_team_members,
        percentage: calculateLimitPercentage(usage.team_members_count, limits.max_team_members),
        message: `You've reached your team member limit (${limits.max_team_members}). Upgrade for more team members.`,
      };
    }

    return {
      allowed: true,
      limit_type: 'team_members',
      current: usage.team_members_count,
      max: limits.max_team_members,
      percentage: calculateLimitPercentage(usage.team_members_count, limits.max_team_members),
    };
  }

  /**
   * Get concurrent upload limit for tier
   */
  getConcurrentUploadLimit(tier: SubscriptionTier): number {
    const limits = getTierLimits(tier);
    return limits.max_concurrent_uploads;
  }

  /**
   * Get max file size for tier (in bytes)
   */
  getMaxFileSize(tier: SubscriptionTier): number {
    const limits = getTierLimits(tier);
    return limits.max_file_size_mb * 1024 * 1024; // Convert to bytes
  }

  /**
   * Increment usage after successful operation
   */
  async incrementUsage(
    tenantId: string,
    type: 'documents' | 'queries',
    amount: number = 1
  ): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Upsert usage tracking
    const { error } = await this.supabase
      .from('usage_tracking')
      .upsert({
        tenant_id: tenantId,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        documents_count: type === 'documents' ? amount : 0,
        conversations_count: type === 'queries' ? amount : 0,
      }, {
        onConflict: 'tenant_id,period_start',
        ignoreDuplicates: false,
      });

    if (error) {
      // Usage increment failed
    }
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get tenant's subscription tier from database
 */
export async function getTenantTier(
  supabase: any,
  tenantId: string
): Promise<SubscriptionTier> {
  const { data, error } = await supabase
    .from('tenants')
    .select('plan_type')
    .eq('id', tenantId)
    .single();

  if (error) {
    return 'starter'; // Default to starter on error
  }

  return (data?.plan_type as SubscriptionTier) || 'starter';
}

