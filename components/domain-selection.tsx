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

  // Generate smart suggestions based on company name
  useEffect(() => {
    const generateSuggestions = async (company: string, industry: string) => {
      const baseName = company.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 20);

      const suggestions = [
        { domain: baseName, available: true, type: 'primary' as const },
        { domain: `${baseName}-corp`, available: true, type: 'alternative' as const },
        { domain: `${baseName}-team`, available: true, type: 'alternative' as const },
        { domain: `${baseName}-ai`, available: true, type: 'alternative' as const },
      ];

      // Check availability for all suggestions
      for (const suggestion of suggestions) {
        await checkDomainAvailability(suggestion.domain, true);
      }

      setSuggestions(suggestions);
    };

    // Enhance domain suggestions with industry context
    const storedIndustry = localStorage.getItem('industry') || 'general';
    if (companyName) {
      generateSuggestions(companyName, storedIndustry);
    }
  }, [companyName]);



  const checkDomainAvailability = async (domain: string, isSuggestion = false) => {
    if (!domain || domain.length < 3) return;

    setIsChecking(true);
    
    try {
      // Check if domain is available (include user email for invitation lookup)
      const userEmail = localStorage.getItem('user-email') || '';
      const response = await fetch(`https://api.docsflow.app/api/subdomain/check?subdomain=${encodeURIComponent(domain)}&email=${encodeURIComponent(userEmail)}`);
      const result = await response.json();

      if (!result.available && result.existingTenant) {
        // Domain exists - check if user has invitation or can request access
        const existingTenant: ExistingTenant = {
          id: result.existingTenant.id,
          subdomain: domain,
          name: result.existingTenant.name,
          industry: result.existingTenant.industry,
          userCount: result.existingTenant.userCount || 1,
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
      // Request to join existing tenant
      const response = await fetch(`https://api.docsflow.app/api/tenant/${existingTenant.id}/request-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: localStorage.getItem('user-email'), // From signup
          message: `Requesting access to join ${existingTenant.name}`
        })
      });

      if (response.ok) {
        alert('Access request sent! The organization owner will review your request.');
      } else {
        throw new Error('Failed to send request');
      }
    } catch (error) {
      console.error('Error requesting access:', error);
      alert('Failed to send access request. Please try again.');
    } finally {
      setRequestingAccess(false);
    }
  };

  const handleDomainSelect = (domain: string) => {
    setSelectedDomain(domain);
    onDomainSelected(domain, false);
  };

  const handleJoinExisting = () => {
    if (existingTenant) {
      onDomainSelected(existingTenant.subdomain, true);
    }
  };

  if (showJoinOption && existingTenant) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building className="w-6 h-6 text-orange-600" />
              <div>
                <CardTitle className="text-orange-900">Organization Found!</CardTitle>
                <CardDescription className="text-orange-700">
                  {existingTenant.name} already uses {existingTenant.subdomain}.docsflow.app
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                <div>
                  <h3 className="font-semibold">{existingTenant.name}</h3>
                  <p className="text-sm text-gray-600">{existingTenant.industry} • {existingTenant.userCount} users</p>
                  <p className="text-sm text-blue-600 font-medium">{existingTenant.subdomain}.docsflow.app</p>
                </div>
                <Users className="w-8 h-8 text-gray-400" />
              </div>

              {existingTenant.hasInvitation ? (
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">You have a pending invitation!</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Redirecting you to accept your invitation...
                  </p>
                  <Loader2 className="w-6 h-6 animate-spin text-green-600 mx-auto" />
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button 
                    onClick={handleRequestAccess}
                    disabled={requestingAccess}
                    className="flex-1"
                  >
                    {requestingAccess ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Requesting...
                      </>
                    ) : (
                      'Request to Join'
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowJoinOption(false)}
                    className="flex-1"
                  >
                    Choose Different Domain
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome to DocsFlow!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Let's get your organization set up
        </p>
      </div>

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
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedDomain === suggestion.domain 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => suggestion.available && handleDomainSelect(suggestion.domain)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono">{suggestion.domain}.docsflow.app</span>
                      {suggestion.type === 'primary' && (
                        <Badge variant="outline" className="text-xs">Recommended</Badge>
                      )}
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