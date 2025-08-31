"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, ArrowRight, Building } from "lucide-react";

export default function AuthRedirectPage() {
  const [message, setMessage] = useState('Checking your account...');
  const [progress, setProgress] = useState(0);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthRedirect = async () => {
      try {
        console.log('🚀 [AUTH-REDIRECT-DEBUG] Starting auth redirect process');
        setMessage('Checking multi-tenant access...');
        setProgress(10);
        
        console.log('🔄 [AUTH-REDIRECT-DEBUG] Importing MultiTenantCookieManager...');
        // ENTERPRISE: Migrate legacy cookies and check multi-tenant state
        const { MultiTenantCookieManager } = await import('@/lib/multi-tenant-cookie-manager');
        console.log('✅ [AUTH-REDIRECT-DEBUG] MultiTenantCookieManager imported');
        
        console.log('🔄 [AUTH-REDIRECT-DEBUG] Migrating legacy cookies...');
        MultiTenantCookieManager.migrateLegacyCookies();
        MultiTenantCookieManager.debugMultiTenantState();
        console.log('✅ [AUTH-REDIRECT-DEBUG] Legacy cookies migrated');
        
        setMessage('Verifying authentication...');
        setProgress(25);
        
        console.log('🔄 [AUTH-REDIRECT-DEBUG] Fetching session from /api/auth/session...');
        // Check session state
        const session = await fetch('/api/auth/session').then(r => r.json());
        console.log('🔍 [AUTH-REDIRECT-DEBUG] Session response:', {
          authenticated: session.authenticated,
          hasTenantId: !!session.tenantId,
          hasUser: !!session.user,
          tenantSubdomain: session.tenant?.subdomain
        });
        setProgress(50);
        
        if (session.authenticated && session.tenantId) {
          console.log('✅ [AUTH-REDIRECT-DEBUG] User authenticated with tenant - processing redirect');
          setTenantInfo(session.tenant);
          setMessage(`Welcome back to ${session.tenant?.name || 'your workspace'}!`);
          setProgress(75);
          
          console.log('🔄 [AUTH-REDIRECT-DEBUG] Adding tenant context...');
          // ENTERPRISE: Add this tenant to user's multi-tenant context
          MultiTenantCookieManager.addTenantContext(
            {
              tenantId: session.tenantId,
              subdomain: session.tenant?.subdomain || window.location.hostname.split('.')[0],
              userEmail: session.user.email
            },
            {
              accessToken: '', // Will be handled by session API
              refreshToken: undefined
            }
          );
          console.log('✅ [AUTH-REDIRECT-DEBUG] Tenant context added');
          
          setProgress(100);
          
          console.log('⏰ [AUTH-REDIRECT-DEBUG] Setting 1.5s timeout for final redirect...');
          // Smooth redirect with delay for UX
          setTimeout(() => {
            const targetUrl = session.tenant?.subdomain 
              ? `https://${session.tenant.subdomain}.docsflow.app/dashboard`
              : '/dashboard';
            console.log('🚀 [AUTH-REDIRECT-DEBUG] Final redirect timeout fired, going to:', targetUrl);
            window.location.href = targetUrl;
          }, 1500);
        } else if (session.authenticated && !session.tenantId) {
          console.log('⚠️ [AUTH-REDIRECT-DEBUG] User authenticated but no tenantId - double checking...');
          // Check if user is actually onboarded via direct API call
          const sessionCheck = await fetch('/api/auth/session');
          const sessionData = await sessionCheck.json();
          console.log('🔍 [AUTH-REDIRECT-DEBUG] Double-check session response:', {
            authenticated: sessionData.authenticated,
            onboardingComplete: sessionData.onboardingComplete,
            hasTenant: !!sessionData.tenant
          });
          
          if (sessionData.authenticated && sessionData.onboardingComplete && sessionData.tenant?.subdomain) {
            setMessage(`Redirecting to ${sessionData.tenant.name || 'your workspace'}...`);
            setProgress(100);
            setTimeout(() => {
              window.location.href = `https://${sessionData.tenant.subdomain}.docsflow.app/dashboard`;
            }, 1000);
          } else {
            setMessage('Setting up your workspace...');
            setProgress(100);
            setTimeout(() => {
              window.location.href = '/onboarding';
            }, 1000);
          }
        } else {
          console.log('❌ [AUTH-REDIRECT-DEBUG] User not authenticated - redirecting to login');
          setMessage('Please sign in to continue...');
          setTimeout(() => {
            console.log('🚀 [AUTH-REDIRECT-DEBUG] Redirecting to login due to no authentication');
            window.location.href = '/login';
          }, 1000);
        }
      } catch (error) {
        console.error('🚨 [AUTH-REDIRECT-DEBUG] Catch block triggered:', error);
        console.error('🚨 [AUTH-REDIRECT-DEBUG] Error type:', typeof error);
        console.error('🚨 [AUTH-REDIRECT-DEBUG] Error details:', error);
        setError('Something went wrong. Redirecting to login...');
        setTimeout(() => {
          console.log('🚀 [AUTH-REDIRECT-DEBUG] Redirecting to login due to error');
          window.location.href = '/login';
        }, 2000);
      }
    };

    handleAuthRedirect();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950">
        <Card className="w-96 p-6 text-center">
          <CardContent className="space-y-4">
            <div className="text-red-600 text-xl">⚠️</div>
            <h2 className="text-xl font-semibold text-red-600">{error}</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950">
      <Card className="w-96 p-8 text-center">
        <CardContent className="space-y-6">
          {progress === 100 && tenantInfo ? (
            <>
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Welcome back!
                </h2>
                <div className="flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-300">
                  <Building className="h-4 w-4" />
                  <span>{tenantInfo.name}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Redirecting to your workspace...
                </p>
              </div>
              <div className="flex items-center justify-center space-x-2 text-blue-600">
                <span className="text-sm">Taking you to your dashboard</span>
                <ArrowRight className="h-4 w-4 animate-pulse" />
              </div>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {message}
                </h2>
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This will only take a moment...
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
