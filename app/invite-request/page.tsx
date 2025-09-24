"use client"

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building, Mail, MessageSquare, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import DocsFlowBrand from '@/components/DocsFlowBrand';

interface InvitationRequest {
  companyName: string;
  userEmail: string;
  message: string;
  subdomain: string;
}

function InviteRequestContent() {
  const searchParams = useSearchParams();
  const subdomain = searchParams.get('subdomain');
  
  const [formData, setFormData] = useState<InvitationRequest>({
    companyName: '',
    userEmail: '',
    message: '',
    subdomain: subdomain || ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenantInfo, setTenantInfo] = useState<any>(null);

  // Load invitation request data from localStorage
  useEffect(() => {
    const invitationData = localStorage.getItem('invitation-request');
    if (invitationData) {
      try {
        const data = JSON.parse(invitationData);
        setFormData(prev => ({
          ...prev,
          companyName: data.companyName || '',
          userEmail: data.userEmail || '',
          subdomain: data.suggestedSubdomain || subdomain || ''
        }));
      } catch (error) {
        console.error('Error parsing invitation request data:', error);
      }
    }
  }, [subdomain]);

  // Fetch tenant information
  useEffect(() => {
    if (formData.subdomain) {
      fetchTenantInfo(formData.subdomain);
    }
  }, [formData.subdomain]);

  const fetchTenantInfo = async (subdomainToCheck: string) => {
    try {
      const response = await fetch(`/api/subdomain/check?subdomain=${subdomainToCheck}`);
      if (response.ok) {
        const data = await response.json();
        if (data.exists && data.tenant) {
          setTenantInfo(data.tenant);
        }
      }
    } catch (error) {
      console.error('Error fetching tenant info:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.userEmail || !formData.message || !formData.subdomain) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/invitations/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subdomain: formData.subdomain,
          userEmail: formData.userEmail,
          companyName: formData.companyName,
          message: formData.message,
          requestType: 'join_existing'
        }),
      });

      if (response.ok) {
        setIsSuccess(true);
        // Clear localStorage
        localStorage.removeItem('invitation-request');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send invitation request');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      console.error('Invitation request error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof InvitationRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Request Sent!
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Your invitation request has been sent to the administrators of{' '}
              <strong>{tenantInfo?.name || formData.subdomain}</strong>.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              You'll receive an email notification once your request is approved.
            </p>
            <Button 
              onClick={() => window.location.href = '/login'}
              className="w-full"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <DocsFlowBrand size="sm" variant="horizontal" iconVariant="primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Request Access
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            The subdomain <strong>{formData.subdomain}</strong> is already taken by{' '}
            <strong>{tenantInfo?.name || 'another organization'}</strong>.
          </p>
        </div>

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
          <CardContent className="pt-4">
            <div className="flex items-start space-x-3">
              <Building className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Organization Already Exists
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-200 mt-1">
                  Request an invitation to join {tenantInfo?.name || 'this organization'} 
                  and get access to their AI-powered document intelligence platform.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Request Form */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Request Invitation</CardTitle>
            <CardDescription>
              Send a request to the organization administrators
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-700 dark:text-red-300 text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userEmail" className="text-sm font-medium">
                  Your Email Address *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="userEmail"
                    type="email"
                    value={formData.userEmail}
                    onChange={(e) => handleInputChange('userEmail', e.target.value)}
                    className="pl-9"
                    placeholder="your.email@company.com"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm font-medium">
                  Your Company/Role
                </Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="companyName"
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    className="pl-9"
                    placeholder="Your company or role"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm font-medium">
                  Message to Administrators *
                </Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    className="pl-9 min-h-[100px] resize-none"
                    placeholder="Hi, I'd like to request access to your organization's DocsFlow platform. I work at..."
                    required
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Explain why you need access and how you're connected to this organization
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Request...
                  </>
                ) : (
                  'Send Invitation Request'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Back to signup link */}
        <p className="text-center text-sm text-gray-600 dark:text-gray-300">
          Want to create a new organization instead?{' '}
          <a
            href="/signup"
            className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            Sign up with a different company name
          </a>
        </p>
      </div>
    </div>
  );
}

export default function InviteRequestPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InviteRequestContent />
    </Suspense>
  );
}
