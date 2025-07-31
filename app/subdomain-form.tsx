'use client';

import type React from 'react';

import { useState, useEffect } from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { rootDomain } from '@/lib/utils';

type CreateState = {
  error?: string;
  success?: boolean;
  subdomain?: string;
  organizationName?: string;
  industry?: string;
};

const INDUSTRIES = [
  { value: 'general', label: 'General Business' },
  { value: 'motorcycle_dealer', label: 'Motorcycle Dealership' },
  { value: 'warehouse_distribution', label: 'Warehouse & Distribution' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'retail', label: 'Retail' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Financial Services' },
  { value: 'technology', label: 'Technology' },
  { value: 'education', label: 'Education' }
];

function SubdomainInput({ 
  defaultValue, 
  checkStatus, 
  onSubdomainChange, 
  suggestions 
}: { 
  defaultValue?: string;
  checkStatus: { status: string; message?: string };
  onSubdomainChange: (value: string) => void;
  suggestions: string[];
}) {
  const getStatusIcon = () => {
    switch (checkStatus.status) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-gray-500" />;
      case 'available':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'taken':
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getInputClassName = () => {
    const base = "w-full rounded-r-none focus:z-10 h-9";
    switch (checkStatus.status) {
      case 'available':
        return `${base} border-green-300 focus:border-green-500`;
      case 'taken':
      case 'error':
        return `${base} border-red-300 focus:border-red-500`;
      default:
        return base;
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="subdomain" className="text-sm">Subdomain</Label>
      <div className="flex items-center">
        <div className="relative flex-1">
          <Input
            id="subdomain"
            name="subdomain"
            placeholder="your-company"
            defaultValue={defaultValue}
            className={getInputClassName()}
            onChange={(e) => onSubdomainChange(e.target.value)}
            required
          />
          {checkStatus.status !== 'idle' && (
            <div className="absolute inset-y-0 right-2 flex items-center">
              {getStatusIcon()}
            </div>
          )}
        </div>
        <span className="bg-gray-100 px-3 border border-l-0 border-input rounded-r-md text-gray-500 min-h-[36px] flex items-center text-sm">
          .{rootDomain}
        </span>
      </div>
      
      {checkStatus.message && (
        <div className={`text-xs p-2 rounded-md ${
          checkStatus.status === 'available' 
            ? 'text-green-700 bg-green-50' 
            : 'text-red-700 bg-red-50'
        }`}>
          {checkStatus.message}
        </div>
      )}
      
      {suggestions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-600">Suggestions:</p>
          <div className="flex flex-wrap gap-1">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  const input = document.querySelector('input[name="subdomain"]') as HTMLInputElement;
                  if (input) {
                    input.value = suggestion;
                    onSubdomainChange(suggestion);
                  }
                }}
                className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <p className="text-xs text-gray-500">
        Choose a unique subdomain for your organization
      </p>
    </div>
  );
}

function OrganizationNameInput({ defaultValue }: { defaultValue?: string }) {
  return (
    <div className="space-y-1">
      <Label htmlFor="organizationName" className="text-sm">Organization Name</Label>
      <Input
        id="organizationName"
        name="organizationName"
        placeholder="Acme Corporation"
        defaultValue={defaultValue}
        className="w-full h-9"
        required
      />
      <p className="text-xs text-gray-500">
        The full name of your organization
      </p>
    </div>
  );
}

function IndustrySelector({
  industry,
  setIndustry,
  defaultValue
}: {
  industry: string;
  setIndustry: (industry: string) => void;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor="industry" className="text-sm">Industry</Label>
      <input type="hidden" name="industry" value={industry} required />
      
      <Select value={industry} onValueChange={setIndustry}>
        <SelectTrigger className="w-full h-9">
          <SelectValue placeholder="Select your industry">
            {industry && (
              <span>{INDUSTRIES.find(ind => ind.value === industry)?.label}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {INDUSTRIES.map((ind) => (
            <SelectItem key={ind.value} value={ind.value}>
              {ind.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <p className="text-xs text-gray-500">
        This customizes your AI assistant for your specific industry
      </p>
    </div>
  );
}

export function SubdomainForm() {
  const [industry, setIndustry] = useState('');
  const [subdomainCheck, setSubdomainCheck] = useState<{
    status: 'idle' | 'checking' | 'available' | 'taken' | 'error';
    message?: string;
  }>({ status: 'idle' });
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [state, setState] = useState<CreateState>({});
  const [isPending, setIsPending] = useState(false);

  // Debounced subdomain availability check
  const checkSubdomainAvailability = async (subdomain: string) => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainCheck({ status: 'idle' });
      return;
    }

    setSubdomainCheck({ status: 'checking' });
    
    try {
      const response = await fetch(`/api/subdomain/check?subdomain=${encodeURIComponent(subdomain)}`);
      const data = await response.json();
      
      if (data.available) {
        setSubdomainCheck({ status: 'available', message: 'Great! This subdomain is available.' });
        setSuggestions([]);
      } else {
        setSubdomainCheck({ 
          status: 'taken', 
          message: data.existingTenant ? 
            `Already taken by ${data.existingTenant.name}. You can request to join this organization.` :
            'This subdomain is not available.'
        });
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      setSubdomainCheck({ status: 'error', message: 'Error checking availability. Please try again.' });
    }
  };

  // Debounce subdomain checking
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const subdomainInput = document.querySelector('input[name="subdomain"]') as HTMLInputElement;
      if (subdomainInput?.value) {
        checkSubdomainAvailability(subdomainInput.value);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Create Your AI Document Intelligence Platform
        </h2>
        <p className="text-sm text-gray-600">
          Set up enterprise-grade AI document analysis for your organization
        </p>
      </div>

      <form onSubmit={async (e) => {
        e.preventDefault();
        setIsPending(true);
        
        const formData = new FormData(e.currentTarget);
        const subdomain = formData.get('subdomain') as string;
        const organizationName = formData.get('organizationName') as string;
        
        // Store basic info for onboarding
        const onboardingData = {
          organizationName,
          subdomain,
          industry,
          timestamp: new Date().toISOString()
        };
        
        // Store in localStorage for onboarding flow
        localStorage.setItem('onboarding-data', JSON.stringify(onboardingData));
        
        // Redirect to our backend onboarding flow
        window.location.href = '/onboarding';
      }} className="space-y-3">
        <OrganizationNameInput defaultValue={state?.organizationName} />
        
        <SubdomainInput 
          defaultValue={state?.subdomain}
          checkStatus={subdomainCheck}
          onSubdomainChange={checkSubdomainAvailability}
          suggestions={suggestions}
        />

        <IndustrySelector industry={industry} setIndustry={setIndustry} defaultValue={state?.industry} />

        {state?.error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
            {state.error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isPending || !industry}>
          {isPending ? 'Creating Platform...' : 'Create AI Platform'}
        </Button>
      </form>

      <div className="text-center text-xs text-gray-500">
        <p>By creating an account, you agree to our Terms of Service and Privacy Policy</p>
      </div>
    </div>
  );
}
