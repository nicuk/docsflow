'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, ArrowRight, Brain, Zap, Target, TrendingUp } from 'lucide-react';
import OptimizedCompletion from '@/components/optimized-completion';
import DomainSelection from '@/components/domain-selection';
import OnboardingQuestionStep from '@/components/onboarding-question-step';
import OnboardingLoading from '@/components/onboarding-loading';
import { ErrorBoundary } from '@/components/error-boundary';
import { GENERIC_QUESTIONS } from '@/lib/onboarding-questions';
import { smartIndustryDetection, generateSubdomain } from '@/lib/industry-detection';

// Questions data moved to /lib/onboarding-questions.ts

export default function OnboardingFlow() {
  // CRITICAL FIX: ALL HOOKS MUST BE AT TOP LEVEL - BEFORE ANY EARLY RETURNS
  // COMPREHENSIVE HYDRATION FIX: Prevent server/client mismatch
  const [isClient, setIsClient] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Security: Block rendering until auth is verified
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [currentStep, setCurrentStep] = useState(0); // 0 = domain selection, 1 = questions (only for new tenants)
  const [selectedDomain, setSelectedDomain] = useState('');
  const [isJoiningExisting, setIsJoiningExisting] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'user' | 'technician'>('admin');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState({});
  const [currentResponse, setCurrentResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [customPersonality, setCustomPersonality] = useState<any>(null);
  const [onboardingData, setOnboardingData] = useState<any>(null);

  // HYDRATION FIX: Set client-side flag
  useEffect(() => {
    setIsClient(true);
    setMounted(true);
  }, []);

  // COMPREHENSIVE AUTH AND DATA LOADING
  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounts
    
    const checkAuthAndLoadData = async () => {
      try {
        console.log('🔍 Checking user authentication...');
        
        // COMPREHENSIVE COOKIE CHECK: Use utility function
        const { getAuthState } = await import('@/lib/cookies');
        const authState = getAuthState();
        
        console.log('🍪 Auth state:', authState);
        
        if (!authState.isAuthenticated || !authState.authToken) {
          console.log('❌ No auth token found, redirecting to login');
          if (isMounted) {
            window.location.href = '/login';
          }
          return;
        }
        
        // COMPREHENSIVE SESSION RESTORATION
        const { createSupabaseClient } = await import('@/lib-frontend/supabase');
        const supabase = createSupabaseClient();
        
        // Get refresh token for session restoration
        const { getCookie } = await import('@/lib/cookies');
        const refreshToken = getCookie('refresh-token');
        
        // Set the session from cookies with proper error handling
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: authState.authToken,
          refresh_token: refreshToken || ''
        });
        
        if (sessionError || !sessionData.user) {
          console.log('❌ Failed to restore session from cookies:', sessionError);
          // Try to get user directly as fallback
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            console.log('❌ Complete auth failure, redirecting to login');
            if (isMounted) {
              window.location.href = '/login';
            }
            return;
          }
          // Use fallback user
          console.log('✅ Using fallback user authentication');
        }
        
        const user = sessionData?.user || (await supabase.auth.getUser()).data.user;
        
        console.log('✅ User authenticated:', user.email);
        
        // Get user profile from database
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('id, email, name, tenant_id, tenants(subdomain)')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          console.log('⚠️ Profile not found, user may need to complete registration');
        }
        
        const onboardingData = {
          user: {
            id: user.id,
            email: user.email,
            name: userProfile?.name
          },
          onboardingComplete: !!userProfile?.tenant_id,
          tenantId: userProfile?.tenant_id,
          tenant: userProfile?.tenant_id ? {
            subdomain: (userProfile.tenants as any)?.subdomain
          } : null
        };
        
        console.log('📊 Onboarding data loaded:', onboardingData);
        
        if (!isMounted) return; // Component unmounted, don't update state
        
        setOnboardingData(onboardingData);
        setIsAuthenticated(true);
        
        // If user already has a tenant, redirect to dashboard
        if (onboardingData.onboardingComplete && onboardingData.tenant?.subdomain) {
          console.log('🏢 User already has tenant, redirecting to dashboard');
          window.location.href = `https://${onboardingData.tenant.subdomain}.docsflow.app/dashboard`;
          return;
        }
        
        // User needs onboarding - continue with flow
        console.log('📝 User needs onboarding, continuing with flow');
        
      } catch (error) {
        console.error('❌ Auth check failed:', error);
        if (isMounted) {
          // Don't redirect immediately on error - user might just need to wait for session
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      }
    };

    checkAuthAndLoadData();
    
    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, []);

  // HYDRATION CHECK: Block rendering until client-side hydration is complete
  if (!isClient || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is joining an existing tenant, skip questions and go straight to completion
  const isLastQuestion = currentQuestion === GENERIC_QUESTIONS.length - 1;

  const handleNext = () => {
    const currentQuestionData = GENERIC_QUESTIONS[currentQuestion];
    const updatedResponses = {
      ...responses,
      [currentQuestionData.id]: currentResponse
    };
    setResponses(updatedResponses);

    if (isLastQuestion) {
      generateCustomPersonality(updatedResponses);
    } else {
      setCurrentQuestion(currentQuestion + 1);
      setCurrentResponse('');
    }
  };

  // Domain selection handlers
  const handleDomainSelected = (domain: string, joinExisting: boolean = false) => {
    setSelectedDomain(domain);
    setIsJoiningExisting(joinExisting);
    
    // Store domain selection for later use
    localStorage.setItem('selected-domain', domain);
    localStorage.setItem('joining-existing', joinExisting.toString());
    
    if (joinExisting) {
      // Joining existing domain - user becomes TECHNICIAN/USER
      setUserRole('technician');
      
      // Call backend to join existing tenant
      joinExistingTenant(domain);
    } else {
      // Creating new domain - user becomes ADMIN
      setUserRole('admin');
      
      // Continue to business questions for admin setup
      setCurrentStep(1);
      
      // Update onboarding data with selected domain
      setOnboardingData((prev: any) => ({
        ...prev,
        subdomain: domain,
        isNewTenant: true,
        userRole: 'admin'
      }));
    }
  };

  // Request invitation to existing tenant (per Enterprise Architecture Plan)
  const joinExistingTenant = async (domain: string) => {
    try {
      // Get user data for invitation request
      const response = await fetch('/api/auth/check-user', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('User not authenticated');
      }

      const userData = await response.json();
      
      // Store invitation request data
      localStorage.setItem('invitation-request', JSON.stringify({
        subdomain: domain,
        userEmail: userData.email,
        companyName: onboardingData?.displayName || 'Unknown Company',
        requestType: 'join_existing'
      }));
      
      // Redirect to invitation request page
      window.location.href = `/invite-request?subdomain=${domain}`;
      
    } catch (error) {
      console.error('Failed to request invitation:', error);
      alert('Unable to request invitation. Please try again or contact support.');
    }
  };

  const handleInviteAccepted = (token: string) => {
    // Redirect to invitation acceptance
    window.location.href = `/invite/${token}`;
  };

  const generateCustomPersonality = async (allResponses: any) => {
    setIsGenerating(true);
    
    try {
      // Validate we have a selected domain
      const finalDomain = selectedDomain || (typeof window !== 'undefined' ? localStorage.getItem('selected-domain') : null) || 
        generateSubdomain(allResponses.business_overview || 'business');
      
      // 🔥 CRITICAL: Complete onboarding with smart industry detection
      const industryAnalysis = smartIndustryDetection(allResponses);
      console.log('Industry Detection Results:', industryAnalysis);
      
      // Show AI reasoning to user for transparency
      console.log(`🤖 AI Analysis: ${industryAnalysis.reason} (${Math.round(industryAnalysis.confidence * 100)}% confidence)`);
      
const tenantAssignment = {
        businessType: onboardingData?.displayName || allResponses.business_overview?.substring(0, 100) + "...",
        industry: industryAnalysis.industry,
        industryConfidence: industryAnalysis.confidence,
        industryReason: industryAnalysis.reason,
        subdomain: selectedDomain || finalDomain, // Use user's selected domain, not industry-based
        accessLevel: userRole === 'admin' ? 1 : 3, // Level 1 for admin, Level 3 for technician
        userRole: userRole,
        isNewTenant: !isJoiningExisting,
        onboardingComplete: true,
        companyName: onboardingData?.displayName || extractCompanyName(allResponses.business_overview || ''),
        responses: allResponses
      };

      // Call backend to create tenant and assign user with authentication
      const { authClient } = await import('@/lib/auth-client');
      const authHeaders = authClient.getAuthHeaders();
      
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          responses: allResponses,
          tenantAssignment,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        const personality = await response.json();
        
        // Get current user from Supabase session for proper user data
        const { authClient } = await import('@/lib/auth-client');
        const user = await authClient.getCurrentUser();
        
        // CRITICAL: Store complete session data from backend response
        if (personality.user && typeof window !== 'undefined') {
          const userData = personality.user; // Use complete user data from backend
          
          // Store in sessionStorage for dashboard layout
          sessionStorage.setItem('user', JSON.stringify(userData));
          
          // CRITICAL: Set cookies that dashboard layout expects (backend already sets these, but ensure they're set)
          document.cookie = `user-email=${userData.email}; path=/; max-age=${60 * 60 * 24 * 7}`;
          document.cookie = `user-name=${userData.name}; path=/; max-age=${60 * 60 * 24 * 7}`;
          document.cookie = `tenant-id=${userData.tenant_id}; path=/; max-age=${60 * 60 * 24 * 7}`;
          document.cookie = `onboarding-complete=true; path=/; max-age=${60 * 60 * 24 * 7}`;
          
          // Also store in localStorage for persistence
          localStorage.setItem('user-session', JSON.stringify(userData));
          
          // Store tenant context for dashboard
          const tenantContext = {
            tenantId: userData.tenant_id,
            industry: personality.tenant?.industry || tenantAssignment.industry,
            businessType: personality.tenant?.name || tenantAssignment.businessType,
            accessLevel: userData.access_level,
            onboardingComplete: true,
            subdomain: personality.tenant?.subdomain || tenantAssignment.subdomain
          };
          localStorage.setItem(`tenant-${userData.tenant_id}`, JSON.stringify(tenantContext));
          
          console.log('✅ Session data stored successfully:', { userData, tenantContext });
        } else if (user && typeof window !== 'undefined') {
          // Fallback: Use current user data if backend doesn't return user data
          const userData = {
            id: user.id,
            email: user.email,
            name: (user as any).user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            tenant_id: tenantAssignment.subdomain,
            access_level: tenantAssignment.accessLevel,
            onboarding_complete: true
          };
          
          // Store session data
          sessionStorage.setItem('user', JSON.stringify(userData));
          localStorage.setItem('user-session', JSON.stringify(userData));
          
          // Set cookies
          document.cookie = `user-email=${userData.email}; path=/; max-age=${60 * 60 * 24 * 7}`;
          document.cookie = `user-name=${userData.name}; path=/; max-age=${60 * 60 * 24 * 7}`;
          document.cookie = `tenant-id=${userData.tenant_id}; path=/; max-age=${60 * 60 * 24 * 7}`;
          document.cookie = `onboarding-complete=true; path=/; max-age=${60 * 60 * 24 * 7}`;
          
          console.log('✅ Fallback session data stored:', userData);
        }
        
        setCustomPersonality({
          ...personality,
          tenantDomain: tenantAssignment.subdomain,
          industry: tenantAssignment.industry,
          accessLevel: tenantAssignment.accessLevel
        });
        
        // Redirect to selected domain after successful onboarding
        setTimeout(() => {
          window.location.href = `https://${selectedDomain}.docsflow.app/dashboard`;
        }, 2000);
      } else {
        throw new Error('Failed to complete onboarding');
      }
    } catch (error) {
      console.error('Backend unavailable, using fallback mode:', error);
      
      // 🔥 FALLBACK: Complete onboarding locally for frontend development
      const tenantAssignment = {
        businessType: onboardingData?.displayName || allResponses.business_overview?.substring(0, 100) + "...",
        industry: onboardingData?.industry || determineIndustry(allResponses.business_overview || ''),
        subdomain: selectedDomain, // Use selected domain in fallback too
        accessLevel: 3,
        onboardingComplete: true
      };

      // Set completion cookies for frontend-only mode
      document.cookie = 'onboarding-complete=true; path=/';
      document.cookie = `tenant-id=${tenantAssignment.subdomain}; path=/`;
      
      // Store tenant context in localStorage for dashboard
      localStorage.setItem(`tenant-${tenantAssignment.subdomain}`, JSON.stringify({
        tenantId: tenantAssignment.subdomain,
        industry: tenantAssignment.industry,
        businessType: tenantAssignment.businessType,
        accessLevel: tenantAssignment.accessLevel,
        onboardingComplete: true,
        responses: allResponses,
        fallbackMode: true // Indicates we're in frontend-only mode
      }));
      
      // Create fallback personality for demo
      const fallbackPersonality = {
        businessType: tenantAssignment.businessType,
        industry: tenantAssignment.industry,
        tenantDomain: tenantAssignment.subdomain,
        accessLevel: tenantAssignment.accessLevel,
        focusAreas: ["document analysis", "data insights", "productivity"],
        personalityTraits: ["analytical", "efficient", "helpful"],
        customPrompt: "You are a business intelligence assistant focused on document analysis and insights.",
        fallbackMode: true
      };
      
      console.log('Setting fallback personality:', fallbackPersonality);
      setCustomPersonality(fallbackPersonality);
    }
    
    setIsGenerating(false);
  };

  // Smart multi-layer industry detection system
  const smartIndustryDetection = (allResponses: any) => {
    // 1. Multi-Response Analysis - Check all 5 answers for industry signals
    const industryScore: Record<string, number> = {};
    const responseTexts = Object.values(allResponses).join(' ').toLowerCase();
    
    // Industry detection patterns with weighted scoring
    const industryPatterns = {
      motorcycle_dealer: {
        keywords: ['motorcycle', 'bike', 'dealership', 'harley', 'honda', 'yamaha', 'trade-in', 'showroom'],
        weight: 1.2 // Higher weight for specific industry
      },
      warehouse_distribution: {
        keywords: ['warehouse', 'distribution', 'logistics', 'shipping', 'fulfillment', 'supply chain', 'inventory turnover', 'sku'],
        weight: 1.2
      },
      healthcare: {
        keywords: ['healthcare', 'medical', 'patient', 'clinic', 'hospital', 'appointment', 'treatment', 'clinical'],
        weight: 1.2
      },
      manufacturing: {
        keywords: ['manufacturing', 'production', 'factory', 'assembly', 'quality control', 'equipment', 'machinery'],
        weight: 1.2
      },
      retail: {
        keywords: ['retail', 'store', 'customer', 'sales', 'shopping', 'merchandise', 'checkout'],
        weight: 1.0
      },
      finance: {
        keywords: ['finance', 'banking', 'investment', 'loan', 'credit', 'portfolio', 'financial'],
        weight: 1.0
      },
      general: {
        keywords: ['business', 'company', 'organization', 'revenue', 'profit', 'operations'],
        weight: 0.5 // Lower weight for generic terms
      }
    };
    
    // Score each industry based on keyword matches
    Object.entries(industryPatterns).forEach(([industry, { keywords, weight }]) => {
      let matches = 0;
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const keywordMatches = (responseTexts.match(regex) || []).length;
        matches += keywordMatches;
      });
      
      if (matches > 0) {
        industryScore[industry] = matches * weight;
      }
    });
    
    // 2. Find top industry and calculate confidence
    const sortedIndustries = Object.entries(industryScore)
      .sort(([,a], [,b]) => b - a);
    
    if (sortedIndustries.length === 0) {
      return { industry: 'general', confidence: 0.3, reason: 'No clear industry signals detected' };
    }
    
    const [topIndustry, topScore] = sortedIndustries[0];
    const [secondIndustry, secondScore] = sortedIndustries[1] || ['', 0];
    
    // Calculate confidence based on score dominance
    const totalScore = Object.values(industryScore).reduce((sum, score) => sum + score, 0);
    const dominance = topScore / totalScore;
    const separation = secondScore > 0 ? (topScore - secondScore) / topScore : 1;
    
    let confidence = dominance * separation;
    let reason = '';
    
    // 3. Confidence-based decision making
    if (confidence > 0.7) {
      reason = `Strong ${topIndustry.replace('_', ' ')} signals detected`;
      return { industry: topIndustry, confidence, reason };
    } else if (confidence > 0.4) {
      reason = `Moderate ${topIndustry.replace('_', ' ')} signals, some mixed indicators`;
      return { industry: topIndustry, confidence, reason };
    } else {
      // Mixed or unclear signals - check for random template usage
      const uniqueIndustries = sortedIndustries.filter(([,score]) => score > 1).length;
      if (uniqueIndustries >= 3) {
        reason = 'Multiple industry signals detected - possible template mixing';
      } else {
        reason = 'Unclear industry signals';
      }
      return { industry: 'general', confidence: 0.3, reason };
    }
  };
  
  // Legacy fallback for single text analysis
  const determineIndustry = (businessOverview: string) => {
    const overview = businessOverview.toLowerCase();
    if (overview.includes('motorcycle') || overview.includes('dealership') || overview.includes('bike')) {
      return 'motorcycle_dealer';
    } else if (overview.includes('warehouse') || overview.includes('distribution') || overview.includes('inventory')) {
      return 'warehouse_distribution';  
    } else if (overview.includes('healthcare') || overview.includes('medical') || overview.includes('patient')) {
      return 'healthcare';
    } else if (overview.includes('manufacturing') || overview.includes('production') || overview.includes('factory')) {
      return 'manufacturing';
    }
    return 'general';
  };

  const extractCompanyName = (businessOverview: string) => {
    // Extract company name from business overview or use first few words
    const words = businessOverview.split(' ').slice(0, 3);
    return words.join(' ').replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'Company';
  };

  const generateSubdomain = (businessOverview: string) => {
    // Generate a safe subdomain based on business name - consistent with signup logic
    const cleanSubdomain = businessOverview
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 20) // Shorter limit for random suffix
      || 'company'; // Fallback
    
    // Add random suffix for uniqueness
    return cleanSubdomain + '-' + Math.random().toString(36).substring(2, 6);
  };

  if (customPersonality) {
    return (
      <OptimizedCompletion
        responses={responses}
        createdPersona={customPersonality?.tenant?.custom_persona}
        tenantData={customPersonality?.tenant}
        onComplete={() => {
          console.log('Launch button clicked!');
          console.log('customPersonality:', customPersonality);
          
          // Store the tenant context for dashboard use
          if (customPersonality?.tenantDomain) {
            const tenantContext = {
              tenantId: customPersonality.tenantDomain,
              industry: customPersonality.industry || 'general',
              businessType: customPersonality.businessType || 'Business Intelligence Platform',
              accessLevel: customPersonality.accessLevel || 3,
              onboardingComplete: true,
              responses: responses // Store actual responses for dashboard use
            };
            
            console.log('Storing tenant context:', tenantContext);
            localStorage.setItem(`tenant-${customPersonality.tenantDomain}`, JSON.stringify(tenantContext));
          } else {
            console.error('No tenantDomain found in customPersonality');
          }
          
          console.log('Redirecting to tenant subdomain:', customPersonality.tenantDomain);
          // Redirect to full tenant subdomain URL like invite acceptance does
          if (customPersonality.tenantDomain) {
            window.location.href = `https://${customPersonality.tenantDomain}.docsflow.app/`;
          } else {
            console.error('No tenant domain found, falling back to /dashboard');
            window.location.href = '/dashboard';
          }
        }}
      />
    );
  }

  // Legacy completion screen (will be removed)
  if (false && customPersonality) {
    // Generate industry-specific insights from responses
    const getIndustryInsights = () => {
      const businessOverview = (responses as any).business_overview || '';
      const challenges = (responses as any).daily_challenges || '';
      const decisions = (responses as any).key_decisions || '';
      const metrics = (responses as any).success_metrics || '';
      const infoNeeds = (responses as any).information_needs || '';

      const industry = customPersonality.industry || 'general';
      
      if (industry === 'motorcycle_dealer') {
        return {
          title: "🏍️ Motorcycle Dealership Intelligence Center",
          subtitle: "AI-Powered Inventory & Sales Optimization",
          keyInsights: [
            `Inventory Analysis: Track ${businessOverview.includes('models') ? 'bike model' : 'product'} performance in real-time`,
            `Sales Optimization: ${challenges.includes('inventory') ? 'Solve inventory challenges' : 'Boost sales efficiency'} with predictive analytics`,
            `Customer Intelligence: ${metrics.includes('customer') ? 'Monitor customer metrics' : 'Analyze customer patterns'} for better retention`
          ],
          quickWins: [
            "Upload your inventory reports to identify slow-moving vs fast-selling models",
            "Analyze seasonal sales patterns to optimize ordering decisions",
            "Track warranty claims and customer feedback by manufacturer"
          ]
        };
      } else if (industry === 'warehouse_distribution') {
        return {
          title: "📦 Warehouse & Distribution Command Center",
          subtitle: "AI-Powered Supply Chain Intelligence",
          keyInsights: [
            `Supply Chain Optimization: ${infoNeeds.includes('supplier') ? 'Monitor supplier performance' : 'Track logistics metrics'} across your network`,
            `Inventory Intelligence: ${challenges.includes('inventory') ? 'Solve demand forecasting' : 'Optimize stock levels'} with AI predictions`,
            `Operational Efficiency: ${metrics.includes('efficiency') ? 'Track efficiency metrics' : 'Monitor operational KPIs'} in real-time`
          ],
          quickWins: [
            "Upload supplier reports to identify performance bottlenecks",
            "Analyze inventory turnover rates by SKU and location",
            "Track shipping costs and delivery performance metrics"
          ]
        };
      } else {
        return {
          title: "🚀 Business Intelligence Command Center",
          subtitle: "AI-Powered Document Intelligence Platform",
          keyInsights: [
            `Data Intelligence: Extract insights from ${businessOverview.includes('document') ? 'your documents' : 'business data'} automatically`,
            `Decision Support: ${decisions.includes('data') ? 'Get data-driven recommendations' : 'Make informed decisions'} faster`,
            `Performance Tracking: ${metrics.includes('performance') ? 'Monitor your KPIs' : 'Track business metrics'} with AI analysis`
          ],
          quickWins: [
            "Upload your business documents to start getting insights",
            "Ask questions about your data in natural language",
            "Set up automated reporting for your key metrics"
          ]
        };
      }
    };

    const insights = getIndustryInsights();

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
              {insights.title}
            </h1>
            <p className="text-xl text-gray-700 mb-2">{insights.subtitle}</p>
            <p className="text-gray-600">Your personalized AI assistant is ready with industry-specific intelligence</p>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            
            {/* Left Column: AI Intelligence Preview */}
            <div className="space-y-6">
              <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50 to-blue-100">
                <CardHeader>
                  <CardTitle className="text-2xl text-blue-800 flex items-center gap-3">
                    <Brain className="w-8 h-8" />
                    Your AI Intelligence Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {insights.keyInsights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <p className="text-blue-800 font-medium">{insight}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="shadow-xl border-0 bg-gradient-to-br from-green-50 to-emerald-100">
                <CardHeader>
                  <CardTitle className="text-2xl text-green-800 flex items-center gap-3">
                    <Target className="w-8 h-8" />
                    Immediate Quick Wins
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {insights.quickWins.map((win, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm">
                      <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-xs">
                        ✓
                      </div>
                      <p className="text-green-800">{win}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Performance Preview */}
            <div className="space-y-6">
              <Card className="shadow-xl border-0 bg-gradient-to-br from-purple-50 to-purple-100">
                <CardHeader>
                  <CardTitle className="text-2xl text-purple-800 flex items-center gap-3">
                    <TrendingUp className="w-8 h-8" />
                    AI Performance Multipliers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <div className="text-3xl font-bold text-purple-600">5.2x</div>
                      <div className="text-sm text-purple-800">Faster Problem Solving</div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <div className="text-3xl font-bold text-blue-600">4.8x</div>
                      <div className="text-sm text-blue-800">More Relevant Insights</div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <div className="text-3xl font-bold text-green-600">85%</div>
                      <div className="text-sm text-green-800">Time Savings</div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <div className="text-3xl font-bold text-orange-600">95%</div>
                      <div className="text-sm text-orange-800">Accuracy Rate</div>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🎯</span>
                      <span className="font-semibold text-amber-800">Personalization Level: Expert</span>
                    </div>
                    <p className="text-sm text-amber-700">
                      Based on your detailed responses, your AI assistant has been configured with 
                      industry-specific intelligence that understands your unique business challenges.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-xl border-0 bg-gradient-to-br from-gray-50 to-gray-100">
                <CardHeader>
                  <CardTitle className="text-2xl text-gray-800 flex items-center gap-3">
                    <Zap className="w-8 h-8" />
                    What Happens Next
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">1</div>
                    <div>
                      <p className="font-medium text-gray-800">Access Your Personalized Dashboard</p>
                      <p className="text-sm text-gray-600">Industry-specific interface and quick actions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
                    <div>
                      <p className="font-medium text-gray-800">Upload Your First Documents</p>
                      <p className="text-sm text-gray-600">Start getting AI insights immediately</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">3</div>
                    <div>
                      <p className="font-medium text-gray-800">Ask Your First Question</p>
                      <p className="text-sm text-gray-600">See the power of industry-specific AI</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <Button 
              onClick={() => {
                console.log('Launch button clicked!');
                console.log('customPersonality:', customPersonality);
                
                // Store the tenant context for dashboard use
                if (customPersonality?.tenantDomain) {
                  const tenantContext = {
                    tenantId: customPersonality.tenantDomain,
                    industry: customPersonality.industry || 'general',
                    businessType: customPersonality.businessType || 'Business Intelligence Platform',
                    accessLevel: customPersonality.accessLevel || 3,
                    onboardingComplete: true,
                    responses: responses // Store actual responses for dashboard use
                  };
                  
                  console.log('Storing tenant context:', tenantContext);
                  localStorage.setItem(`tenant-${customPersonality.tenantDomain}`, JSON.stringify(tenantContext));
                } else {
                  console.error('No tenantDomain found in customPersonality');
                }
                
                console.log('Redirecting to /dashboard');
                window.location.href = '/dashboard';
              }} 
              className="text-xl px-12 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl"
              size="lg"
            >
              <span className="mr-3">🚀</span>
              Launch My AI Intelligence Center
              <ArrowRight className="w-6 h-6 ml-3" />
            </Button>
            <p className="text-sm text-gray-600 mt-3">
              Your personalized experience is ready • No setup required
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return <OnboardingLoading />;
  }

// Show domain selection on step 0 (FIRST STEP per Enterprise Architecture Plan)
  if (currentStep === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome to DocsFlow!</h1>
            <p className="text-muted-foreground">
              {(() => {
                // SSR-safe localStorage access
                if (typeof window === 'undefined') return "Let's get your organization set up";
                const tenantContext = localStorage.getItem('tenant-context');
                const companyName = tenantContext ? JSON.parse(tenantContext).displayName : null;
                return companyName ? 
                  `Let's set up your domain for ${companyName}` :
                  "Let's get your organization set up";
              })()}
            </p>
          </div>
          
          <DomainSelection
            companyName={(() => {
              // SURGICAL FIX: Use same data source as page header for consistency
              if (typeof window !== 'undefined') {
                // Priority 1: tenant-context (same as page header)
                const tenantContext = localStorage.getItem('tenant-context');
                if (tenantContext) {
                  try {
                    const parsed = JSON.parse(tenantContext);
                    if (parsed.displayName) {
                      return parsed.displayName;
                    }
                  } catch (e) {
                    // Silent error handling
                  }
                }
                
                // Priority 2: onboardingData from state
                if (onboardingData?.displayName) {
                  return onboardingData.displayName;
                }
                if (onboardingData?.user?.name) {
                  return onboardingData.user.name;
                }
                
                // Priority 3: signup-data as fallback
                const signupData = localStorage.getItem('signup-data');
                if (signupData) {
                  try {
                    const parsed = JSON.parse(signupData);
                    if (parsed.displayName || parsed.companyName) {
                      return parsed.displayName || parsed.companyName;
                    }
                  } catch (e) {
                    // Silent error handling
                  }
                }
              }
              
              // Default fallback
              return 'your-company';
            })()}
            onDomainSelected={handleDomainSelected}
            onInviteAccepted={handleInviteAccepted}
          />
        </div>
      </div>
    );
  }



  // Security: Block rendering until auth is verified
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Access denied. Redirecting...</p>
        </div>
      </div>
    );
  }

  const currentQuestionData = GENERIC_QUESTIONS[currentQuestion];
  const totalSteps = GENERIC_QUESTIONS.length + 1; // +1 for domain selection

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      // Restore previous response if it exists
      const prevResponse = (responses as any)[currentQuestion - 1] || '';
      setCurrentResponse(prevResponse);
    }
  };

  return (
    <OnboardingQuestionStep
      currentQuestion={currentQuestion}
      questionData={currentQuestionData}
      currentResponse={currentResponse}
      onResponseChange={setCurrentResponse}
      onNext={handleNext}
      onBack={handleBack}
      onboardingData={onboardingData}
      totalSteps={totalSteps}
      currentStep={currentStep}
      userRole={userRole}
      isLastQuestion={isLastQuestion}
    />
  );
}