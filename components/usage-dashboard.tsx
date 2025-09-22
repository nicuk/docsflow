'use client';

import { useEffect, useState } from 'react';
import { getCurrentUsage } from '@/lib/plan-enforcement';
import { SUBSCRIPTION_PLANS } from '@/lib/tenant-limits';

interface UsageDashboardProps {
  tenantId: string;
  planType: string;
}

interface UsageData {
  documents: number;
  conversations: number;
  storage: number;
  users: number;
}

export function UsageDashboard({ tenantId, planType }: UsageDashboardProps) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const plan = SUBSCRIPTION_PLANS[planType] || SUBSCRIPTION_PLANS.starter;

  useEffect(() => {
    async function fetchUsage() {
      try {
        const usageData = await getCurrentUsage(tenantId);
        setUsage(usageData);
      } catch (err) {
        setError('Failed to load usage data');
        console.error('Error fetching usage:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUsage();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600 text-center">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!usage) return null;

  const usageItems = [
    {
      label: 'Documents',
      current: usage.documents,
      limit: planType === 'enterprise' || planType === 'unlimited' ? 'unlimited' : 
             planType === 'professional' ? 500 : 
             planType === 'starter' ? 50 : 5,
      unit: 'documents',
      color: 'blue'
    },
    {
      label: 'Conversations',
      current: usage.conversations,
      limit: planType === 'enterprise' || planType === 'unlimited' ? 'unlimited' : 
             planType === 'professional' ? 5000 : 
             planType === 'starter' ? 500 : 50,
      unit: 'this month',
      color: 'green'
    },
    {
      label: 'Storage',
      current: usage.storage,
      limit: planType === 'unlimited' ? 'unlimited' :
             planType === 'enterprise' ? 100000 :
             planType === 'professional' ? 10000 :
             planType === 'starter' ? 1000 : 100,
      unit: 'MB',
      color: 'purple'
    },
    {
      label: 'Users',
      current: usage.users,
      limit: plan.userLimit,
      unit: 'users',
      color: 'orange'
    }
  ];

  const getProgressPercentage = (current: number, limit: number | 'unlimited') => {
    if (limit === 'unlimited') return 0;
    return Math.min((current / limit) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Usage Dashboard</h3>
            <p className="text-sm text-gray-600">Current plan: {plan.name}</p>
          </div>
          <button
            onClick={() => window.location.href = '/pricing'}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Upgrade Plan
          </button>
        </div>
      </div>

      {/* Usage Items */}
      <div className="p-6 space-y-6">
        {usageItems.map((item) => {
          const percentage = getProgressPercentage(item.current, item.limit);
          const isNearLimit = percentage >= 75;
          
          return (
            <div key={item.label}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {item.label}
                </span>
                <span className="text-sm text-gray-600">
                  {item.current.toLocaleString()} / {
                    item.limit === 'unlimited' ? '∞' : item.limit.toLocaleString()
                  } {item.unit}
                </span>
              </div>
              
              {item.limit !== 'unlimited' && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(percentage)}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              )}
              
              {item.limit === 'unlimited' && (
                <div className="text-xs text-green-600 font-medium">
                  ✓ Unlimited
                </div>
              )}
              
              {isNearLimit && item.limit !== 'unlimited' && (
                <div className="mt-1 text-xs text-amber-600 font-medium">
                  ⚠️ Approaching limit - Consider upgrading
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="/billing"
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium text-center transition-colors"
          >
            Manage Billing
          </a>
          <a
            href="/pricing"
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium text-center transition-colors"
          >
            View Plans
          </a>
        </div>
      </div>
    </div>
  );
}
