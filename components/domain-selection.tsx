"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Loader2, Building, Users, ArrowRight } from 'lucide-react';

interface DomainSelectionProps {
  companyName?: string;
  onDomainSelected: (domain: string, joinExisting?: boolean) => void;
  onInviteAccepted?: (tenantId: string) => void;
}

interface DomainSuggestion {
  domain: string;
  available: boolean;
  type: 'primary' | 'alternative';
  description?: string;
}

interface ExistingTenant {
  id: string;
  subdomain: string;
  name: string;
  industry: string;
  userCount: number;
  canJoin: boolean;
  hasInvitation: boolean;
  invitationToken?: string;
}

export default function DomainSelection({ companyName, onDomainSelected, onInviteAccepted }: DomainSelectionProps) {
  const [selectedDomain, setSelectedDomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [suggestions, setSuggestions] = useState<DomainSuggestion[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [existingTenant, setExistingTenant] = useState<ExistingTenant | null>(null);
  const [showJoinOption, setShowJoinOption] = useState(false);
  const [requestingAccess, setRequestingAccess] = useState(false);

  // Generate smart business-focused suggestions based on company name
  useEffect(() => {
    const generateSuggestions = async (company: string, industry: string) => {
      console.log('🔍 DomainSelection generateSuggestions called with:', { company, industry });
      if (!company) {
        console.warn('⚠️ No company name provided to generateSuggestions');
        return;
      }
      
      const baseName = company.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 20);

      // Business-focused domain alternatives based on corporate structure
      const businessSuffixes = [
        { suffix: 'ops', description: 'Operations' },
        { suffix: 'hq', description: 'Headquarters' },
        { suffix: 'main', description: 'Main Office' },
        { suffix: 'mgmt', description: 'Management' },
        { suffix: 'admin', description: 'Administration' },
        { suffix: 'global', description: 'Global Operations' },
        { suffix: 'us', description: 'US Operations' }
      ];

      const suggestions: DomainSuggestion[] = [
        { domain: baseName, available: true, type: 'primary' as const, description: 'Primary domain' },
        ...businessSuffixes.slice(0, 3).map(({ suffix, description }) => ({
          domain: `${baseName}-${suffix}`,
          available: true,
          type: 'alternative' as const,
          description
        }))
      ];

      // Check availability for all suggestions in parallel
      const availabilityChecks = suggestions.map(async (suggestion) => {
        try {
          const response = await fetch('/api/subdomain/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subdomain: suggestion.domain })
          });
          
          if (response.ok) {
            const data = await response.json();
            suggestion.available = !data.exists;
          }
        } catch (error) {
          console.error(`Failed to check ${suggestion.domain}:`, error);
          // Assume available on error to not block user
          suggestion.available = true;
        }
        return suggestion;
      });

      const checkedSuggestions = await Promise.all(availabilityChecks);
      setSuggestions(checkedSuggestions);
    };

    // Generate suggestions when component mounts or companyName changes
    console.log('🔍 DomainSelection useEffect triggered with companyName:', companyName);
    if (companyName) {
      // Get industry from onboarding data or detect from company name
      const storedIndustry = localStorage.getItem('industry') || 'technology';
      generateSuggestions(companyName, storedIndustry);
    } else {
      console.warn('⚠️ DomainSelection: No companyName prop received');
    }
  }, [companyName]);



  const checkDomainAvailability = async (domain: string, isSuggestion = false) => {
    if (!domain || domain.length < 3) return;

    setIsChecking(true);
    
    try {
      // Check if domain is available (include user email for invitation lookup)
      const userEmail = localStorage.getItem('user-email') || '';
      const response = await fetch(`/api/subdomain/check?subdomain=${encodeURIComponent(domain)}&email=${encodeURIComponent(userEmail)}`);
      const result = await response.json();

      if (!result.available && result.existingTenant) {
        // 🎯 CLERK MIGRATION FIX: If workspace exists but has NO users, treat as new workspace
        // This handles orphaned tenants from incomplete signups
        const userCount = result.existingTenant.userCount || 0;
        
        if (userCount === 0) {
          console.log('🔄 [DOMAIN SELECTION] Workspace exists but has no users - treating as new workspace');
          // Clear existing tenant flag and continue with new workspace flow
          setExistingTenant(null);
          setShowJoinOption(false);
          return { available: true, domain }; // Treat as available
        }
        
        // Domain exists with users - check if user has invitation or can request access
        const existingTenant: ExistingTenant = {
          id: result.existingTenant.id,
          subdomain: domain,
          name: result.existingTenant.name,
          industry: result.existingTenant.industry,
          userCount: userCount,
          canJoin: true,
          hasInvitation: result.hasInvitation || false,
          invitationToken: result.invitationToken
        };

        setExistingTenant(existingTenant);
        setShowJoinOption(true);

        // If user has pending invitation, auto-redirect
        if (existingTenant.hasInvitation && existingTenant.invitationToken) {
          setTimeout(() => {
            onInviteAccepted?.(existingTenant.invitationToken!);
          }, 2000);
        }
      } else {
        // Domain is available
        setExistingTenant(null);
        setShowJoinOption(false);
        
        if (!isSuggestion) {
          setSelectedDomain(domain);
        }
      }

      // Update suggestions if this was a suggestion check
      if (isSuggestion) {
        setSuggestions(prev => prev.map(s => 
          s.domain === domain ? { ...s, available: result.available } : s
        ));
      }

    } catch (error) {
      console.error('Error checking domain availability:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleDomainInput = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setCustomDomain(sanitized);
    
    // Debounce domain checking
    clearTimeout((window as any).domainTimeout);
    (window as any).domainTimeout = setTimeout(() => {
      checkDomainAvailability(sanitized);
    }, 500);
  };

  const handleRequestAccess = async () => {
    if (!existingTenant) return;
    
    setRequestingAccess(true);
    
    try {
      // Get user email from storage or auth
      const userEmail = localStorage.getItem('user-email') || 
                       localStorage.getItem('user_email');
      
      if (!userEmail) {
        alert('Please sign in first to request access.');
        window.location.href = '/login';
        return;
      }
      
      // Use enhanced access request system with admin dashboard integration  
      const userName = localStorage.getItem('user-name') || 
                      localStorage.getItem('user_name') || 
                      companyName || 'Unknown User';
      
      const response = await fetch('/api/access-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSubdomain: existingTenant.subdomain,
          userEmail: userEmail,
          userName: userName,
          requestedRole: 'user',
          requestedAccessLevel: 3,
          requestReason: `Requesting access to join ${existingTenant.name} workspace during onboarding`
        })
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        // Show success message based on response
        if (responseData.status === 'submitted') {
          alert('✅ Access request submitted successfully! The organization admin will review your request and notify you via email.');
        } else if (responseData.status === 'pending') {
          alert('ℹ️ You already have a pending access request for this organization. Please wait for admin approval.');
        }
        
        // Redirect to main domain with success message
        setTimeout(() => {
          window.location.href = 'https://docsflow.app/login?message=access_requested';
        }, 2000);
      } else if (responseData.status === 'already_member') {
        // User is already a member - redirect to login
        alert('You are already a member of this organization. Please sign in.');
        window.location.href = responseData.redirectUrl || `https://${existingTenant.subdomain}.docsflow.app/login`;
      } else {
        throw new Error(responseData.error || 'Failed to send request');
      }
    } catch (error) {
      console.error('Access request error:', error);
      alert(`Failed to send access request: ${error.message}. Please try again or contact support.`);
    } finally {
      setRequestingAccess(false);
    }
  };

  const handleDomainSelect = async (domain: string) => {
    setSelectedDomain(domain);
    // CRITICAL: Check availability first to show modal for existing tenants
    await checkDomainAvailability(domain);
    // Don't call onDomainSelected here - let the user click Continue button
  };

  const handleJoinExisting = () => {
    if (existingTenant) {
      onDomainSelected(existingTenant.subdomain, true);
    }
  };

  if (showJoinOption && existingTenant) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-950">
          <CardHeader className="text-center pb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Building className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
              Workspace Found
            </CardTitle>
            <CardDescription className="text-xl text-muted-foreground">
              {existingTenant.name} has an active DocsFlow workspace
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-8">
            {/* Premium Company Showcase */}
            <div className="bg-gradient-to-r from-background to-muted/50 rounded-2xl p-6 border shadow-lg">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Building className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">{existingTenant.name}</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-medium">
                        {existingTenant.industry}
                      </Badge>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span className="text-sm font-medium">{existingTenant.userCount} members</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Trust Indicators */}
                <div className="flex flex-col items-end gap-2">
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Enterprise Security
                  </Badge>
                </div>
              </div>
              
              {/* Workspace URL Display */}
              <div className="bg-muted/50 rounded-xl p-4 border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-mono text-lg font-bold text-foreground">
                    {existingTenant.subdomain}.docsflow.app
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Secure AI-powered document intelligence platform
                </p>
              </div>
              
              {/* Value Proposition */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-3 bg-background rounded-lg shadow-sm border">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">AI</div>
                  <div className="text-xs text-muted-foreground">Powered</div>
                </div>
                <div className="text-center p-3 bg-background rounded-lg shadow-sm border">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">99.9%</div>
                  <div className="text-xs text-muted-foreground">Uptime</div>
                </div>
                <div className="text-center p-3 bg-background rounded-lg shadow-sm border">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">SOC 2</div>
                  <div className="text-xs text-muted-foreground">Compliant</div>
                </div>
              </div>
            </div>

            {existingTenant.hasInvitation ? (
              <div className="text-center space-y-4 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-2xl border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-lg text-green-800 dark:text-green-200">Invitation Ready!</h4>
                    <p className="text-sm text-green-600 dark:text-green-400">You have access to this workspace</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-green-600 dark:text-green-400" />
                  <span className="text-green-700 dark:text-green-300 font-medium">Redirecting to your workspace...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Enhanced Value Proposition */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                  <h4 className="font-bold text-xl text-blue-900 dark:text-blue-100 mb-3">
                    Join {existingTenant.name}'s Workspace
                  </h4>
                  <p className="text-blue-700 dark:text-blue-300 mb-4">
                    Get instant access to AI-powered document intelligence, team collaboration, and enterprise-grade security.
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <CheckCircle className="w-4 h-4" /> Enterprise AI Tools
                    </span>
                    <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <CheckCircle className="w-4 h-4" /> Team Collaboration
                    </span>
                    <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <CheckCircle className="w-4 h-4" /> Document Intelligence
                    </span>
                    <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <CheckCircle className="w-4 h-4" /> 24/7 Support
                    </span>
                  </div>
                </div>
                
                {/* Premium Action Buttons */}
                <div className="flex gap-4">
                  <Button 
                    onClick={handleRequestAccess}
                    disabled={requestingAccess}
                    className="flex-1 h-16 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl"
                  >
                    {requestingAccess ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-3" />
                        Requesting Access...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-5 h-5 mr-3" />
                        Access Workspace
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowJoinOption(false)}
                    className="flex-1 h-16 text-lg font-semibold border-2 hover:bg-muted/50"
                  >
                    Create New Workspace
                  </Button>
                </div>
                
                {/* Professional Help Text */}
                <div className="text-center p-4 bg-muted/30 rounded-lg border">
                  <p className="text-sm text-muted-foreground">
                    Need assistance? Contact our enterprise support team at{' '}
                    <span className="font-medium text-blue-600 dark:text-blue-400">support@docsflow.app</span>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">


      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Choose Your Domain
          </CardTitle>
          <CardDescription>
            Select a professional subdomain for your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Smart Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-3 block">Suggested Domains</Label>
              <div className="grid gap-2">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.domain}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedDomain === suggestion.domain 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                        : 'hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    } ${
                      !suggestion.available ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={() => suggestion.available && handleDomainSelect(suggestion.domain)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="font-mono text-sm font-medium">{suggestion.domain}.docsflow.app</span>
                        {suggestion.description && (
                          <span className="text-xs text-muted-foreground mt-1">{suggestion.description}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {suggestion.type === 'primary' && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Recommended</Badge>
                        )}
                        {suggestion.type === 'alternative' && (
                          <Badge variant="secondary" className="text-xs">Business</Badge>
                        )}
                      </div>
                    </div>
                    {suggestion.available ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Domain Input */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Or Choose Custom Domain</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center border rounded-lg">
                <Input
                  value={customDomain}
                  onChange={(e) => handleDomainInput(e.target.value)}
                  placeholder="your-company"
                  className="border-0 flex-1"
                />
                <span className="px-3 text-gray-500 border-l">.docsflow.app</span>
              </div>
              {isChecking && <Loader2 className="w-5 h-5 animate-spin" />}
            </div>
            {customDomain && customDomain.length >= 3 && !isChecking && (
              <p className="text-sm mt-2 text-green-600">
                ✓ {customDomain}.docsflow.app is available
              </p>
            )}
          </div>

          {/* Continue Button */}
          {selectedDomain && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Selected Domain:</p>
                  <p className="text-blue-600 font-mono">{selectedDomain}.docsflow.app</p>
                </div>
                <Button onClick={() => onDomainSelected(selectedDomain, false)}>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}