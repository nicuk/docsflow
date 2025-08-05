import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight, Sparkles, Brain, Zap, Target } from 'lucide-react';
import { motion } from 'framer-motion';

interface OptimizedCompletionProps {
  responses: Record<string, string>;
  onComplete: () => void;
}

interface PersonalizedInsights {
  welcomeMessage: string;
  keyStrengths: string[];
  quickWins: string[];
  nextSteps: string[];
  confidence: number;
  isUsingLLM?: boolean;
}

export function OptimizedCompletion({ responses, onComplete }: OptimizedCompletionProps) {
  const [insights, setInsights] = useState<PersonalizedInsights | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { icon: Brain, title: "AI Analysis", description: "Processing your business profile" },
    { icon: Target, title: "Personalization", description: "Configuring your assistant" },
    { icon: Zap, title: "Ready!", description: "Your intelligence center is ready" }
  ];

  useEffect(() => {
    generatePersonalizedInsights();
  }, []);

  const generatePersonalizedInsights = async () => {
    setIsGenerating(true);
    
    // Realistic AI processing steps
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    try {
      // 🔥 CORRECT: Backend API handles all AI generation securely
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://ai-lead-router-saas.vercel.app/api';
      const response = await fetch(`${apiUrl}/tenant/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responses,
          tenantAssignment: {
            businessType: responses.business_overview?.substring(0, 100) || 'Business',
            industry: determineIndustry(responses.business_overview || ''),
            subdomain: `demo-${Date.now()}`,
            accessLevel: 3,
            onboardingComplete: true
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const customPersona = result.tenant?.custom_persona;
        
        // Check if we got real LLM-generated content
        const isLLMGenerated = customPersona?.created_from === 'onboarding_answers';
        
        // Convert backend persona to frontend format
        const personalizedInsights: PersonalizedInsights = {
          welcomeMessage: customPersona?.role || 'Your Business Intelligence Center is ready',
          keyStrengths: customPersona?.focus_areas || ['Document analysis', 'Business insights', 'Decision support'],
          quickWins: generateQuickWins(customPersona?.industry || 'general', []),
          nextSteps: generateNextSteps(customPersona?.industry || 'general'),
          confidence: isLLMGenerated ? 0.95 : 0.75,
          isUsingLLM: isLLMGenerated
        };
        
        setInsights(personalizedInsights);
        
        if (isLLMGenerated) {
          console.log('✅ Successfully generated persona using backend Gemini AI');
        } else {
          console.log('🔄 Generated persona using backend templates (no API key)');
        }
        
      } else {
        throw new Error('Backend API unavailable');
      }
      
    } catch (error) {
      console.error('Backend persona generation failed:', error);
      // 🔄 ULTIMATE FALLBACK: Simple frontend template system
      setInsights(generateSmartFallback(responses));
    }
    
    setIsGenerating(false);
  };

  const determineIndustry = (overview: string): string => {
    const text = overview.toLowerCase();
    if (text.includes('motorcycle') || text.includes('bike') || text.includes('dealership')) return 'motorcycle_dealer';
    if (text.includes('warehouse') || text.includes('distribution') || text.includes('logistics')) return 'warehouse_distribution';
    if (text.includes('healthcare') || text.includes('medical') || text.includes('patient')) return 'healthcare';
    if (text.includes('manufacturing') || text.includes('production') || text.includes('factory')) return 'manufacturing';
    return 'general';
  };

  const generateSmartFallback = (responses: Record<string, string>): PersonalizedInsights => {
    const businessOverview = responses.business_overview || '';
    const challenges = responses.daily_challenges || '';
    const decisions = responses.key_decisions || '';
    
    // Smart industry detection
    const industry = detectIndustry(businessOverview);
    
    // Extract key business terms for personalization
    const businessTerms = extractBusinessTerms(businessOverview);
    const challengeTerms = extractChallengeTerms(challenges);
    
    return {
      welcomeMessage: generateWelcomeMessage(industry, businessTerms),
      keyStrengths: generateKeyStrengths(industry, businessTerms, challengeTerms),
      quickWins: generateQuickWins(industry, challengeTerms),
      nextSteps: generateNextSteps(industry),
      confidence: 0.85,
      isUsingLLM: false
    };
  };

  const detectIndustry = (overview: string) => {
    const text = overview.toLowerCase();
    if (text.includes('motorcycle') || text.includes('bike') || text.includes('dealership')) return 'motorcycle_dealer';
    if (text.includes('warehouse') || text.includes('distribution') || text.includes('logistics')) return 'warehouse_distribution';
    if (text.includes('healthcare') || text.includes('medical') || text.includes('patient')) return 'healthcare';
    if (text.includes('manufacturing') || text.includes('production') || text.includes('factory')) return 'manufacturing';
    return 'general';
  };

  const extractBusinessTerms = (text: string) => {
    const businessWords = ['revenue', 'sales', 'customer', 'product', 'service', 'team', 'operations', 'growth'];
    return businessWords.filter(word => text.toLowerCase().includes(word));
  };

  const extractChallengeTerms = (text: string) => {
    const challengeWords = ['inventory', 'efficiency', 'cost', 'time', 'quality', 'performance', 'data', 'analysis'];
    return challengeWords.filter(word => text.toLowerCase().includes(word));
  };

  const generateWelcomeMessage = (industry: string, terms: string[]) => {
    const industryMessages: Record<string, string> = {
      motorcycle_dealer: "Your Motorcycle Dealership Intelligence Center is ready",
      warehouse_distribution: "Your Distribution Command Center is optimized",
      healthcare: "Your Healthcare Intelligence Platform is configured", 
      manufacturing: "Your Manufacturing Analytics Hub is active",
      general: "Your Business Intelligence Center is personalized"
    };
    return industryMessages[industry] || industryMessages.general;
  };

  const generateKeyStrengths = (industry: string, businessTerms: string[], challengeTerms: string[]) => {
    const base = [
      `AI-powered analysis of your ${industry.replace('_', ' ')} operations`,
      `Instant insights from your business documents`,
      `Smart recommendations based on your challenges`
    ];
    
    if (businessTerms.includes('sales')) base.push('Sales performance optimization');
    if (challengeTerms.includes('inventory')) base.push('Inventory intelligence and forecasting');
    if (challengeTerms.includes('efficiency')) base.push('Operational efficiency improvements');
    
    return base.slice(0, 3);
  };

  const generateQuickWins = (industry: string, challengeTerms: string[]) => {
    const industryWins: Record<string, string[]> = {
      motorcycle_dealer: ['Upload inventory reports', 'Analyze sales trends', 'Track customer preferences'],
      warehouse_distribution: ['Monitor stock levels', 'Optimize shipping routes', 'Analyze supplier performance'],
      healthcare: ['Process patient data', 'Analyze treatment outcomes', 'Monitor compliance metrics'],
      manufacturing: ['Track production metrics', 'Monitor quality control', 'Optimize supply chain'],
      general: ['Upload business documents', 'Ask data questions', 'Generate insights']
    };
    
    return industryWins[industry] || industryWins.general;
  };

  const generateNextSteps = (industry: string) => {
    return [
      'Upload your first documents',
      'Ask your first question',
      'Explore AI insights'
    ];
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8 text-center">
            <motion.div
              key={currentStep}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-6"
            >
              {React.createElement(steps[currentStep].icon, {
                className: "w-16 h-16 text-blue-600 mx-auto animate-pulse"
              })}
            </motion.div>
            
            <h2 className="text-2xl font-bold mb-2">{steps[currentStep].title}</h2>
            <p className="text-muted-foreground mb-6">{steps[currentStep].description}</p>
            
            <div className="flex justify-center space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{insights.welcomeMessage}</h1>
          <p className="text-gray-600">Your AI assistant is configured and ready to work</p>
        </div>

        {/* Main Content - Single Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Key Strengths */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-blue-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Your AI Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {insights.keyStrengths.map((strength, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">
                      {index + 1}
                    </div>
                    <p className="text-sm text-blue-800">{strength}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Wins */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Immediate Quick Wins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {insights.quickWins.map((win, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center text-white text-xs">
                      ✓
                    </div>
                    <p className="text-sm text-green-800">{win}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-purple-800 flex items-center gap-2">
                <ArrowRight className="w-5 h-5" />
                What's Next
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {insights.nextSteps.map((step, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {index + 1}
                    </div>
                    <p className="text-sm text-purple-800">{step}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Single CTA */}
        <div className="text-center">
          <Button 
            onClick={onComplete}
            className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl"
            size="lg"
          >
            <Zap className="w-5 h-5 mr-3" />
            Launch Intelligence Center
            <ArrowRight className="w-5 h-5 ml-3" />
          </Button>
          <p className="text-sm text-gray-600 mt-3">
            {insights.isUsingLLM ? (
              <>🤖 AI-Personalized • {Math.round(insights.confidence * 100)}% confidence</>
            ) : (
              <>📋 Template-Based • {Math.round(insights.confidence * 100)}% confidence • No backend available</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default OptimizedCompletion; 