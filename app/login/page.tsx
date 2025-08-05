
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Check for admin credentials from onboarding
  useEffect(() => {
    const adminCreds = localStorage.getItem('admin-credentials');
    if (adminCreds) {
      try {
        const credentials = JSON.parse(adminCreds);
        setFormData({
          email: credentials.email || '',
          password: credentials.password || ''
        });
        // Clear the credentials after use
        localStorage.removeItem('admin-credentials');
      } catch (error) {
        console.error('Error parsing admin credentials:', error);
      }
    }
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError(null);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use environment variable for OAuth redirect URI to ensure consistency
      // This prevents localhost redirect issues in production deployments
      const redirectUrl = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || 'https://api.docsflow.app/api/auth/google/callback';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });

      if (error) {
        throw error;
      }

      // The user will be redirected to Google, then back to our callback
    } catch (error) {
      console.error('Google login error:', error);
      setError(error instanceof Error ? error.message : 'Google login failed');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!formData.email || !formData.password) {
      setError('All fields are required');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const result = await response.json();
      
      if (result.success) {
        // Store user data in localStorage for session management (compatible with frontend)
        localStorage.setItem('user_session', JSON.stringify({
          user: result.user,
          timestamp: Date.now()
        }));
        
        // CRITICAL: Also store in frontend-compatible format
        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('access_token', result.user.access_token);
        localStorage.setItem('refresh_token', result.user.refresh_token);
        localStorage.setItem('user-email', result.user.email);
        
        // Set cookies for frontend compatibility
        document.cookie = `user-email=${result.user.email}; path=/; secure; samesite=strict`;
        document.cookie = `auth-token=${result.user.access_token}; path=/; secure; samesite=strict`;
        if (result.user.tenant_id) {
          document.cookie = `tenant-id=${result.user.tenant_id}; path=/; secure; samesite=strict`;
        }
        
        // Check if user has completed onboarding
        console.log('🔍 Login Success - Checking onboarding status:', {
          onboarding_completed: result.user.onboarding_completed,
          has_tenant: !!result.user.tenant,
          tenant_id: result.user.tenant_id,
          user_email: result.user.email
        });
        
        if (result.user.onboarding_completed && result.user.tenant) {
          // User has completed onboarding, redirect to their tenant dashboard
          console.log('✅ User has completed onboarding, redirecting to tenant dashboard');
          const isProduction = window.location.hostname !== 'localhost';
          if (isProduction) {
            console.log(`🚀 Production redirect to: https://${result.user.tenant.subdomain}.docsflow.app/dashboard`);
            window.location.href = `https://${result.user.tenant.subdomain}.docsflow.app/dashboard`;
          } else {
            // Development: use internal tenant routing
            console.log(`🔧 Development redirect to: /app/${result.user.tenant.subdomain}/dashboard`);
            router.push(`/app/${result.user.tenant.subdomain}/dashboard`);
          }
        } else {
          // User hasn't completed onboarding, redirect to onboarding flow
          console.log('🔄 User needs onboarding - redirecting to onboarding flow');
          console.log('📋 Onboarding redirect reason:', {
            missing_onboarding: !result.user.onboarding_completed,
            missing_tenant: !result.user.tenant,
            will_redirect_to: '/onboarding'
          });
          
          // Force redirect to onboarding
          window.location.href = '/onboarding';
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <p className="text-gray-600">Welcome back! Please enter your details.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your@email.com"
                autoComplete="email"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            <Button 
              type="button"
              variant="outline" 
              onClick={handleGoogleLogin} 
              className="w-full mt-4"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </Button>
          </div>

          <div className="mt-6 text-center text-sm">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link href="/register" className="text-blue-600 hover:text-blue-500 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

