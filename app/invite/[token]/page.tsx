'use client'

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Building, Check, Shield, Users } from 'lucide-react';

interface InvitationData {
  id: string;
  email: string;
  tenantName: string;
  tenantIndustry: string;
  invitedBy: string;
  accessLevel: number;
  department: string;
  role: string;
  expiresAt: string;
  status: string;
}

const ACCESS_LEVELS = {
  1: { name: 'Public Access', description: 'Basic documents and info', color: 'bg-green-100 text-green-800' },
  2: { name: 'Customer Access', description: 'Customer-specific content', color: 'bg-blue-100 text-blue-800' },
  3: { name: 'Employee Access', description: 'Internal procedures and data', color: 'bg-purple-100 text-purple-800' },
  4: { name: 'Manager Access', description: 'Financial and operational data', color: 'bg-orange-100 text-orange-800' },
  5: { name: 'Executive Access', description: 'All sensitive information', color: 'bg-red-100 text-red-800' }
};

export default function InviteAcceptancePage() {
  const params = useParams();
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  
  // User profile form
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    loadInvitation();
  }, []);

  const loadInvitation = async () => {
    try {
      const response = await fetch(`/api/invitations/${params.token}`);
      
      if (response.ok) {
        const data = await response.json();
        setInvitation(data);
        
        // Check if invitation is expired
        if (new Date(data.expiresAt) < new Date()) {
          setError('This invitation has expired. Please contact your administrator for a new invitation.');
        } else if (data.status !== 'pending') {
          setError('This invitation is no longer valid.');
        }
      } else {
        setError('Invalid invitation link.');
      }
    } catch (error) {
      setError('Failed to load invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!name || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setAccepting(true);
    setError('');

    try {
      const response = await fetch(`/api/invitations/${params.token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          password
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Set auth cookies and redirect to tenant dashboard
        document.cookie = `auth-token=${data.authToken}; path=/`;
        document.cookie = `tenant-id=${data.tenantSubdomain}; path=/`;
        document.cookie = 'onboarding-complete=true; path=/';
        
        // Redirect to tenant dashboard
        window.location.href = `https://${data.tenantSubdomain}.docsflow.app/`;
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to accept invitation');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invitation</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => router.push('/')} variant="outline">
                Go to Homepage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-blue-100 p-3">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <CardTitle>You're Invited!</CardTitle>
            <CardDescription>
              Complete your profile to join {invitation?.tenantName}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Invitation Details */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Organization:</span>
                <span className="font-medium">{invitation?.tenantName}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Department:</span>
                <Badge variant="outline">
                  <Building className="h-3 w-3 mr-1" />
                  {invitation?.department}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Access Level:</span>
                <Badge className={ACCESS_LEVELS[invitation?.accessLevel as keyof typeof ACCESS_LEVELS]?.color}>
                  <Shield className="h-3 w-3 mr-1" />
                  Level {invitation?.accessLevel}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Invited by:</span>
                <span className="text-sm">{invitation?.invitedBy}</span>
              </div>
            </div>

            {/* Profile Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={invitation?.email || ''}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password (min 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <Button 
              onClick={handleAcceptInvitation}
              disabled={accepting}
              className="w-full gap-2"
            >
              {accepting ? (
                'Creating Account...'
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Accept Invitation & Join Team
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              By accepting this invitation, you agree to the organization's policies and terms of use.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 