"use client"

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

// Component that uses useSearchParams - must be wrapped in Suspense
function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const state = searchParams.get('state');

        if (error) {
          setStatus('error');
          setMessage(`Authentication failed: ${error}`);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No authorization code received');
          return;
        }

        // Verify state parameter
        const storedState = localStorage.getItem('oauth-state');
        if (state !== storedState) {
          setStatus('error');
          setMessage('Invalid state parameter');
          return;
        }

        // Handle Supabase OAuth callback
        const { supabase } = await import('@/lib/supabase');

        // Exchange code for session
        const { data, error: oauthError } = await supabase.auth.exchangeCodeForSession(code);

        if (oauthError) {
          console.error('Supabase OAuth error:', oauthError);
          setStatus('error');
          setMessage(oauthError.message || 'Failed to authenticate with Google');
          return;
        }

        if (!data.user) {
          setStatus('error');
          setMessage('No user data received from Google');
          return;
        }

        // Create user object in expected format
        const user = {
          id: data.user.id,
          email: data.user.email || '',
          access_token: data.session?.access_token || '',
          refresh_token: data.session?.refresh_token || '',
          tenant_id: null,
          access_level: 3
        };

        // Store user data
        localStorage.setItem('access_token', user.access_token);
        localStorage.setItem('refresh_token', user.refresh_token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('user-email', user.email);
        localStorage.setItem('signup-data', JSON.stringify({
          email: user.email,
          companyName: extractCompanyFromEmail(user.email),
          authMethod: 'google'
        }));

        setStatus('success');
        setMessage('Google authentication successful! Redirecting...');

        // Redirect to onboarding for domain selection
        setTimeout(() => {
          router.push('/onboarding');
        }, 1500);

      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage('Authentication processing failed');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  // Extract company name from email domain
  const extractCompanyFromEmail = (email: string): string => {
    const domain = email.split('@')[1];
    if (!domain) return 'company';
    
    // Remove common email providers
    const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
    if (commonDomains.includes(domain.toLowerCase())) {
      return email.split('@')[0]; // Use username part
    }
    
    // Use domain name for business emails
    return domain.split('.')[0];
  };

  const getIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-8 h-8 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'error':
        return <XCircle className="w-8 h-8 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className={`w-full max-w-md ${getStatusColor()}`}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <CardTitle className="text-xl">
            {status === 'processing' && 'Completing Sign In'}
            {status === 'success' && 'Welcome to DocsFlow!'}
            {status === 'error' && 'Sign In Failed'}
          </CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        
        {status === 'error' && (
          <CardContent className="text-center">
            <button
              onClick={() => router.push('/login')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </CardContent>
        )}
        
        {status === 'success' && (
          <CardContent className="text-center">
            <p className="text-sm text-gray-600">
              Taking you to the setup process...
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// Loading component for Suspense fallback
function AuthCallbackLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-blue-200 bg-blue-50">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
          <CardTitle className="text-xl">Loading...</CardTitle>
          <CardDescription>
            Preparing authentication...
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

// Main component with Suspense wrapper
export default function AuthCallback() {
  return (
    <Suspense fallback={<AuthCallbackLoading />}>
      <AuthCallbackHandler />
    </Suspense>
  );
}