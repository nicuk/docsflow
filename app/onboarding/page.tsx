'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { rootDomain } from '@/lib/utils';

interface OnboardingData {
  organizationName?: string;
  subdomain?: string;
  industry?: string;
  timestamp?: string;
}

interface OnboardingAnswers {
  business_overview: string;
  daily_challenges: string;
  key_decisions: string;
  success_metrics: string;
  information_needs: string;
}

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

const QUESTIONS = [
  {
    id: 'business_overview',
    title: 'Tell us about your business',
    description: 'Describe what your business does, your main services or products, and your target market.',
    placeholder: 'e.g., We are a motorcycle dealership specializing in Harley-Davidson bikes and custom modifications...'
  },
  {
    id: 'daily_challenges',
    title: 'What are your biggest daily challenges?',
    description: 'What problems do you face regularly that slow down your operations or impact your success?',
    placeholder: 'e.g., Managing inventory levels, tracking customer preferences, coordinating with suppliers...'
  },
  {
    id: 'key_decisions',
    title: 'What important decisions do you make regularly?',
    description: 'What choices do you need to make that could benefit from better information or insights?',
    placeholder: 'e.g., Which products to stock, pricing strategies, staff scheduling, vendor selection...'
  },
  {
    id: 'success_metrics',
    title: 'How do you measure success?',
    description: 'What key performance indicators or metrics matter most to your business?',
    placeholder: 'e.g., Monthly sales targets, customer satisfaction scores, inventory turnover, profit margins...'
  },
  {
    id: 'information_needs',
    title: 'What information do you wish you had easier access to?',
    description: 'What data or insights would help you make better decisions if they were more readily available?',
    placeholder: 'e.g., Customer buying patterns, market trends, supplier performance, financial forecasts...'
  }
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    business_overview: '',
    daily_challenges: '',
    key_decisions: '',
    success_metrics: '',
    information_needs: ''
  });
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [subdomainInput, setSubdomainInput] = useState('');
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = QUESTIONS.length + 1; // 5 questions + subdomain step
  const progress = ((currentStep + 1) / totalSteps) * 100;

  useEffect(() => {
    // DEBUG: Log current state
    console.log('🔍 ONBOARDING DEBUG - Initial currentStep:', currentStep);
    console.log('🔍 ONBOARDING DEBUG - QUESTIONS.length:', QUESTIONS.length);
    
    // Load pre-filled data from localStorage
    const storedData = localStorage.getItem('onboarding-data');
    console.log('🔍 ONBOARDING DEBUG - localStorage data:', storedData);
    
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        console.log('🔍 ONBOARDING DEBUG - Parsed data:', data);
        
        // CRITICAL FIX: Only load organization data, NOT step progression
        // This prevents localStorage from corrupting the question flow
        setOnboardingData({
          organizationName: data.organizationName,
          industry: data.industry,
          timestamp: data.timestamp
        });
        
        // Only set subdomain if we're actually on the subdomain step
        if (currentStep >= QUESTIONS.length && data.subdomain) {
          setSubdomainInput(data.subdomain);
        }
        
        console.log('🔍 ONBOARDING DEBUG - After loading, currentStep should be:', currentStep);
      } catch (error) {
        console.error('Error parsing onboarding data:', error);
        // Clear corrupted data
        localStorage.removeItem('onboarding-data');
      }
    }
    
    // FORCE: Ensure new users always start at step 0 (first question)
    if (currentStep !== 0) {
      console.log('🚨 ONBOARDING DEBUG - Resetting currentStep from', currentStep, 'to 0');
      setCurrentStep(0);
    }
  }, []);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const checkSubdomainAvailability = async (subdomain: string) => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainAvailable(null);
      setError(null);
      return;
    }

    setCheckingSubdomain(true);
    setError(null);
    try {
      const response = await fetch(`/api/subdomain/check?subdomain=${encodeURIComponent(subdomain.toLowerCase())}`);
      const result = await response.json();
      
      if (response.ok) {
        setSubdomainAvailable(result.available);
        if (!result.available && result.error) {
          setError(result.error);
        }
      } else {
        setSubdomainAvailable(null);
        setError(result.error || 'Failed to check subdomain availability');
      }
    } catch (error) {
      console.error('Error checking subdomain:', error);
      setSubdomainAvailable(null);
      setError('Network error while checking subdomain availability');
    } finally {
      setCheckingSubdomain(false);
    }
  };

  const handleSubdomainChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomainInput(sanitized);
    
    // Debounce subdomain checking
    clearTimeout((window as any).subdomainTimeout);
    (window as any).subdomainTimeout = setTimeout(() => {
      checkSubdomainAvailability(sanitized);
    }, 500);
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isCurrentStepValid = () => {
    if (currentStep < QUESTIONS.length) {
      const currentQuestion = QUESTIONS[currentStep];
      return answers[currentQuestion.id as keyof OnboardingAnswers].trim().length > 0;
    } else {
      // Subdomain step
      return subdomainInput.length >= 3 && subdomainAvailable === true;
    }
  };

  const handleSubmit = async () => {
    if (!isCurrentStepValid()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const requestData = {
        ...answers,
        businessName: onboardingData.organizationName || answers.business_overview.substring(0, 50),
        industry: onboardingData.industry || 'general',
        businessType: onboardingData.organizationName || 'Business',
        subdomain: subdomainInput.toLowerCase()
      };

      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete onboarding');
      }

      const result = await response.json();
      
      // Clear localStorage
      localStorage.removeItem('onboarding-data');
      
      // Store admin credentials for login
      if (result.admin_credentials) {
        localStorage.setItem('admin-credentials', JSON.stringify(result.admin_credentials));
        alert(`Onboarding complete! Your admin credentials:\n\nEmail: ${result.admin_credentials.email}\nPassword: ${result.admin_credentials.password}\n\nYou will be redirected to login.`);
      }
      
      // Redirect to login page
      window.location.href = result.redirect_url;
      
    } catch (error) {
      console.error('Onboarding submission error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestionStep = (questionIndex: number) => {
    const question = QUESTIONS[questionIndex];
    
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl">{question.title}</CardTitle>
          <p className="text-gray-600">{question.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={answers[question.id as keyof OnboardingAnswers]}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={question.placeholder}
            className="min-h-32 resize-none"
            rows={4}
          />
          
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            <Button
              type="button"
              onClick={nextStep}
              disabled={!isCurrentStepValid()}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSubdomainStep = () => {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl">Choose Your Platform Domain</CardTitle>
          <p className="text-gray-600">
            Select a unique subdomain for your AI document intelligence platform
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {onboardingData.organizationName && (
            <div>
              <Label className="text-sm font-medium">Organization Name</Label>
              <Input
                value={onboardingData.organizationName}
                disabled
                className="bg-gray-50 mt-1"
              />
            </div>
          )}
          
          <div>
            <Label className="text-sm font-medium">Subdomain</Label>
            <div className="flex items-center mt-1">
              <div className="relative flex-1">
                <Input
                  value={subdomainInput}
                  onChange={(e) => handleSubdomainChange(e.target.value)}
                  placeholder="your-company"
                  className="rounded-r-none focus:z-10"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  {checkingSubdomain && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                  {!checkingSubdomain && subdomainAvailable === true && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {!checkingSubdomain && subdomainAvailable === false && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
              <span className="bg-gray-100 px-3 border border-l-0 border-input rounded-r-md text-gray-500 min-h-[40px] flex items-center text-sm">
                .{rootDomain}
              </span>
            </div>
            
            {subdomainAvailable === false && (
              <p className="text-sm text-red-600 mt-1">
                This subdomain is already taken. Please try another one.
              </p>
            )}
            {subdomainAvailable === true && (
              <p className="text-sm text-green-600 mt-1">
                Great! This subdomain is available.
              </p>
            )}
            {subdomainInput.length > 0 && subdomainInput.length < 3 && (
              <p className="text-sm text-gray-600 mt-1">
                Subdomain must be at least 3 characters long.
              </p>
            )}
          </div>
          
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}
          
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
            >
              Previous
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!isCurrentStepValid() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating Platform...
                </>
              ) : (
                'Create AI Platform'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Set Up Your AI Assistant
          </h1>
          <p className="text-gray-600">
            Answer a few questions to customize your AI document intelligence platform
          </p>
        </div>

        {/* Progress */}
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStep + 1} of {totalSteps}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Content */}
        {(() => {
          console.log('🔍 RENDER DEBUG - currentStep:', currentStep);
          console.log('🔍 RENDER DEBUG - QUESTIONS.length:', QUESTIONS.length);
          console.log('🔍 RENDER DEBUG - Should show questions?', currentStep < QUESTIONS.length);
          
          if (currentStep < QUESTIONS.length) {
            console.log('✅ RENDER DEBUG - Showing question step:', currentStep);
            return renderQuestionStep(currentStep);
          } else {
            console.log('🚨 RENDER DEBUG - Showing subdomain step instead of questions!');
            return renderSubdomainStep();
          }
        })()}
      </div>
    </div>
  );
}
