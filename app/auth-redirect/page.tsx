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
        setMessage('Verifying authentication...');
        setProgress(25);
        
        // Check session state
        const session = await fetch('/api/auth/session').then(r => r.json());
        setProgress(50);
        
        if (session.authenticated && session.tenantId) {
          setTenantInfo(session.tenant);
          setMessage(`Welcome back to ${session.tenant?.name || 'your workspace'}!`);
          setProgress(75);
          
          // Clear any stale cookies before redirect
          document.cookie = 'tenant-id=; path=/; domain=.docsflow.app; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'user_email=; path=/; domain=.docsflow.app; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          
          // Set fresh tenant context
          document.cookie = `tenant-id=${session.tenantId}; path=/; domain=.docsflow.app; secure; samesite=lax; max-age=86400`;
          document.cookie = `user_email=${session.user.email}; path=/; domain=.docsflow.app; secure; samesite=lax; max-age=86400`;
          
          setProgress(100);
          
          // Smooth redirect with delay for UX
          setTimeout(() => {
            if (session.tenant?.subdomain) {
              window.location.href = `https://${session.tenant.subdomain}.docsflow.app/dashboard`;
            } else {
              window.location.href = '/dashboard';
            }
          }, 1500);
        } else if (session.authenticated && !session.tenantId) {
          setMessage('Setting up your workspace...');
          setProgress(100);
          setTimeout(() => {
            window.location.href = '/onboarding';
          }, 1000);
        } else {
          setMessage('Please sign in to continue...');
          setTimeout(() => {
            window.location.href = '/login';
          }, 1000);
        }
      } catch (error) {
        console.error('Auth redirect error:', error);
        setError('Something went wrong. Redirecting to login...');
        setTimeout(() => {
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
