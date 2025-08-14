'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ArrowRight, Building2, Users, FileText, Brain } from 'lucide-react';

export default function OnboardingSuccessPage() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState('');
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    // Get tenant info from localStorage (set during onboarding)
    const tenant = localStorage.getItem('tenant_name') || 'your organization';
    setTenantName(tenant);

    // Auto-redirect countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-2xl mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-3xl font-bold">Welcome to DocsFlow!</CardTitle>
          <CardDescription className="text-lg mt-2">
            Your workspace for <span className="font-semibold">{tenantName}</span> has been successfully created
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
            <h3 className="font-semibold mb-3">What's been set up for you:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <Building2 className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Custom Workspace</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Your dedicated tenant environment</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">AI Personas</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Customized for your industry</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Document System</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Ready for your knowledge base</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Admin Access</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Full control over your workspace</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm">
              <span className="font-semibold">Security Note:</span> For your protection, please sign in again to access your new workspace. 
              This ensures your session is properly secured.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => router.push('/login')}
              size="lg"
              className="w-full"
            >
              Sign In to Your Workspace
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            
            <p className="text-center text-sm text-gray-500">
              Redirecting to login in {countdown} seconds...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
