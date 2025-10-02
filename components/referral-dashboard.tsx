'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, Gift, Users, DollarSign, TrendingUp, Share2, Mail } from 'lucide-react';
import { getReferralStats } from '@/lib/referral-system';

interface ReferralStats {
  totalReferrals: number;
  conversions: number;
  earnings: number;
  pendingRewards: number;
}

interface ReferralDashboardProps {
  userId: string;
  userEmail: string;
  referralCode?: string;
}

export default function ReferralDashboard({ userId, userEmail, referralCode }: ReferralDashboardProps) {
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    conversions: 0,
    earnings: 0,
    pendingRewards: 0,
  });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const referralLink = referralCode 
    ? `${window.location.origin}/signup?ref=${referralCode}`
    : '';

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    try {
      // TODO: Call API to get stats
      const response = await fetch(`/api/referrals/stats?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading referral stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Check out DocsFlow - AI Document Intelligence');
    const body = encodeURIComponent(
      `Hey!\n\nI've been using DocsFlow for AI-powered document intelligence and thought you might find it useful.\n\nGet an extended trial (60 days instead of 30) when you sign up with my link:\n${referralLink}\n\nLet me know if you have questions!`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  if (!referralCode) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>
            Referral program is not available for your account yet. Contact support to enable it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Referral Program
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Share DocsFlow with friends and earn rewards when they sign up
        </p>
      </div>

      {/* Reward Tiers Info */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-900 dark:text-blue-100">
            <Gift className="w-5 h-5 mr-2" />
            How Rewards Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
              <div className="font-semibold text-gray-900 dark:text-white mb-1">
                🎯 Friend Signs Up
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                You: $50 credit • Them: 60-day trial
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
              <div className="font-semibold text-gray-900 dark:text-white mb-1">
                💳 Friend Subscribes
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                You: 3 months free • Them: 20% off 3 months
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
              <div className="font-semibold text-gray-900 dark:text-white mb-1">
                📅 Friend Buys Annual
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                You: $500 cash • Them: Extra 10% off
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
              <div className="font-semibold text-gray-900 dark:text-white mb-1">
                🚀 Friend Goes Enterprise
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                You: 50% off forever • Them: $1,000 credit
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total Referrals
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.totalReferrals}
                </p>
              </div>
              <Users className="w-10 h-10 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Conversions
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.conversions}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total Earned
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  ${stats.earnings}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Pending
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.pendingRewards}
                </p>
              </div>
              <Gift className="w-10 h-10 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Share Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
          <CardDescription>
            Share this link with friends to get credit for referrals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              onClick={() => copyToClipboard(referralLink)}
              variant="outline"
              className="flex-shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={shareViaEmail}
              variant="outline"
              className="flex-1"
            >
              <Mail className="w-4 h-4 mr-2" />
              Share via Email
            </Button>
            
            <Button
              onClick={() => {
                const text = `Check out DocsFlow - AI Document Intelligence! Get 60-day trial: ${referralLink}`;
                if (navigator.share) {
                  navigator.share({ text, url: referralLink });
                } else {
                  copyToClipboard(text);
                }
              }}
              variant="outline"
              className="flex-1"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>

          {/* Referral Code Display */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Your Referral Code
            </div>
            <div className="flex items-center justify-between">
              <code className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {referralCode}
              </code>
              <Button
                onClick={() => copyToClipboard(referralCode)}
                size="sm"
                variant="ghost"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Friends can enter this code during signup
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips for Success */}
      <Card>
        <CardHeader>
          <CardTitle>Tips for Maximum Rewards</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-gray-600 dark:text-gray-300">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>
                <strong>Target the right people:</strong> Share with teams that process lots of documents (legal, HR, real estate)
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>
                <strong>Show value first:</strong> Explain how DocsFlow saved you time before sharing the link
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>
                <strong>Follow up:</strong> Check in after a week to see if they need help getting started
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>
                <strong>Focus on annual buyers:</strong> $500 cash reward for each annual plan referral
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Terms */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Rewards are processed within 7 days of conversion. Cash rewards paid via PayPal or bank transfer.
        Credits applied automatically to your account. Terms subject to change.
      </div>
    </div>
  );
}

