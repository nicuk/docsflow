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

function SubdomainInput({ defaultValue }: { defaultValue?: string }) {
  return (
    <div className="space-y-1">
      <Label htmlFor="subdomain" className="text-sm">Subdomain</Label>
      <div className="flex items-center">
        <div className="relative flex-1">
          <Input
            id="subdomain"
            name="subdomain"
            placeholder="your-company"
            defaultValue={defaultValue}
            className="w-full rounded-r-none focus:z-10 h-9"
            required
          />
        </div>
        <span className="bg-gray-100 px-3 border border-l-0 border-input rounded-r-md text-gray-500 min-h-[36px] flex items-center text-sm">
          .{rootDomain}
        </span>
      </div>
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

  const [state, setState] = useState<CreateState>({});
  const [isPending, setIsPending] = useState(false);

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
        
        // Redirect to frontend onboarding flow (superior UX)
        window.location.href = 'https://docsflow.app/onboarding';
      }} className="space-y-3">
        <OrganizationNameInput defaultValue={state?.organizationName} />
        
        <SubdomainInput defaultValue={state?.subdomain} />

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
