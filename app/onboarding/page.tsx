'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, ArrowRight, Brain, Zap, Target, TrendingUp } from 'lucide-react';
import OptimizedCompletion from '@/components/optimized-completion';
import DomainSelection from '@/components/domain-selection';

const GENERIC_QUESTIONS = [
  {
    id: 'business_overview',
    question: "Tell us about your business",
    subtext: "What do you do? What industry are you in? What makes your company unique?",
    placeholder: "We are a motorcycle dealership that specializes in Harley-Davidson bikes and custom modifications...",
    impactMultiplier: "4.8x",
    impactDescription: "more relevant responses when we understand your business model",
    examples: [
      "We operate a multi-location automotive parts distribution network serving 500+ repair shops across the Southeast, specializing in high-performance aftermarket components with same-day delivery",
      "We're a regional healthcare system with 12 clinics processing 2,000+ patient visits monthly, focusing on preventive care and chronic disease management with integrated EHR systems",
      "We manufacture precision-engineered luxury furniture for Fortune 500 corporate headquarters, managing complex supply chains with 50+ international suppliers and $10M+ annual contracts"
    ]
  },
  {
    id: 'daily_challenges',
    question: "What are your biggest daily challenges?",
    subtext: "What problems slow you down? What keeps you up at night?",
    placeholder: "Our biggest challenge is managing inventory - we never know which bikes will sell fast and which will sit on the lot for months...",
    impactMultiplier: "5.2x",
    impactDescription: "better problem-solving when we know your pain points",
    examples: [
      "Demand forecasting across 847 SKUs - we're constantly either overstocked on slow-movers (tying up $2M+ in dead inventory) or out-of-stock on fast-sellers (losing $50K+ weekly in sales)",
      "Patient no-show rates averaging 23% cost us $180K annually in lost revenue, while emergency walk-ins create scheduling chaos that cascades through our entire day, affecting 40+ other appointments",
      "Quality control bottlenecks where manual inspection of 200+ daily units creates delivery delays, and defects discovered at client sites cost us $25K+ in expedited replacements and reputation damage"
    ]
  },
  {
    id: 'key_decisions',
    question: "What important decisions do you make regularly?",
    subtext: "What choices require data? What decisions impact your bottom line?",
    placeholder: "Every month we decide which bikes to order, how to price trade-ins, and which marketing campaigns to run...",
    impactMultiplier: "4.6x",
    impactDescription: "more actionable insights for your specific decision-making needs",
    examples: [
      "Pricing strategy decisions affecting $5M+ annual revenue - analyzing competitor pricing, cost fluctuations, and demand elasticity to optimize margins while maintaining market share across 25+ product categories",
      "Capacity planning decisions for 150+ staff across multiple shifts - predicting patient volume, balancing specialist availability, and optimizing resource allocation to maintain 95% utilization without burnout",
      "Capital investment decisions for $2M+ annual equipment purchases - evaluating ROI on new machinery, comparing lease vs buy scenarios, and timing investments to maximize tax benefits and operational efficiency"
    ]
  },
  {
    id: 'success_metrics',
    question: "How do you measure success?",
    subtext: "What numbers matter most? What would make you say 'we're winning'?",
    placeholder: "Success for us means turning inventory faster, higher profit margins per bike, and more repeat customers...",
    impactMultiplier: "4.3x",
    impactDescription: "more focused analysis on metrics that actually matter to you",
    examples: [
      "Inventory turnover rate above 12x annually, gross margins maintaining 28%+, customer retention rate exceeding 85%, and same-day fulfillment rate hitting 95%+ while keeping carrying costs under 18% of inventory value",
      "Patient satisfaction scores above 4.8/5.0, appointment utilization rate of 92%+, average revenue per patient visit increasing 8% YoY, and clinical outcome improvements measurable through HbA1c, blood pressure, and preventive screening compliance rates",
      "Production efficiency metrics: OEE (Overall Equipment Effectiveness) above 85%, defect rates below 0.3%, on-time delivery performance of 98%+, and customer quality ratings averaging 4.9/5.0 with repeat order rates exceeding 90%"
    ]
  },
  {
    id: 'information_needs',
    question: "What information do you wish you had easier access to?",
    subtext: "What data would help you make better decisions faster?",
    placeholder: "I wish I could quickly see which bike models are trending, seasonal demand patterns, and competitor pricing...",
    impactMultiplier: "5.1x",
    impactDescription: "more targeted document analysis focusing on your information gaps",
    examples: [
      "Real-time demand signals across all channels (B2B orders, market trends, seasonal patterns), supplier performance analytics (delivery times, quality scores, price volatility), and profitability analysis by SKU including true carrying costs and opportunity costs",
      "Integrated patient journey analytics combining clinical outcomes with financial metrics, population health trends affecting our service area, provider productivity benchmarks, and predictive indicators for chronic disease progression to enable proactive interventions",
      "End-to-end production visibility from raw material costs to delivered product profitability, real-time quality metrics correlated with supplier batch data, customer satisfaction feedback linked to specific production runs, and predictive maintenance schedules optimized for minimal downtime"
    ]
  }
];

export default function OnboardingFlow() {
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

  // Authentication and onboarding data loading
  React.useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        // First, verify user is authenticated
        console.log('🔍 Checking user authentication...');
        
        // Add retry logic for session persistence issues
        let response: Response | null = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          response = await fetch('/api/auth/check-user', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          console.log(`🔍 Auth check attempt ${retryCount + 1}:`, {
            status: response?.status,
            ok: response?.ok
          });
          
          if (response?.ok) {
            break;
          }
          
          // If 401 and we have retries left, wait and retry
          if (response?.status === 401 && retryCount < maxRetries - 1) {
            console.log(`⏳ Auth failed, retrying in ${(retryCount + 1) * 500}ms...`);
            await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 500));
            retryCount++;
            continue;
          }
          
          break;
        }
        
        if (!response || !response.ok) {
          // Get error details for debugging
          let errorText = 'No response received';
          let errorData = null;
          
          if (response) {
            try {
              const responseClone = response.clone();
              errorText = await response.text();
              
              // Try to parse as JSON for more details
              if (errorText.startsWith('{')) {
                errorData = JSON.parse(errorText);
              }
            } catch (e) {
              console.error('🔍 Error parsing response:', e);
            }
          }
          
          console.error('❌ AUTH CHECK FAILED - DETAILED DEBUG:', {
            status: response?.status || 'unknown',
            statusText: response?.statusText || 'unknown',
            errorText: errorText,
            errorData: errorData,
            retries: retryCount + 1,
            url: '/api/auth/check-user',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            cookies: document.cookie
          });
          
          // Check if we're already on login page to prevent redirect loop
          if (window.location.pathname !== '/login') {
            console.log('❌ User not authenticated, redirecting to login in 5 seconds...');
            console.log('🔍 DEBUGGING: Please take screenshot of console now!');
            
            // Add delay to allow debugging
            setTimeout(() => {
              console.log('🔄 Redirecting to login now...');
              window.location.href = '/login';
            }, 5000);
          }
          return;
        }

        const userData = await response.json();
        console.log('✅ Auth check successful, user data:', userData);
        
        // Check if user already completed onboarding
        if (userData.onboardingComplete && userData.tenantId) {
          console.log('✅ User already completed onboarding, redirecting to dashboard');
          window.location.href = '/dashboard';
          return;
        }
        
        console.log('🔄 User needs onboarding, proceeding with onboarding flow...');

        // Load onboarding data from localStorage or user data
        const storedData = localStorage.getItem('onboarding-data');
        const signupData = localStorage.getItem('signup-data');
        
        if (storedData) {
          setOnboardingData(JSON.parse(storedData));
        } else if (signupData) {
          // Use signup data if no onboarding data exists
          const parsedSignupData = JSON.parse(signupData);
          setOnboardingData({
            organizationName: parsedSignupData.companyName,
            subdomain: parsedSignupData.companyName?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company',
            industry: 'general',
            email: parsedSignupData.email || userData.email,
            userId: userData.id
          });
        } else {
          // Fallback to user data from backend
          setOnboardingData({
            organizationName: userData.tenant?.name || 'Your Company',
            subdomain: userData.tenant?.subdomain || 'company',
            industry: userData.tenant?.industry || 'general',
            email: userData.email,
            userId: userData.id
          });
        }
        
      } catch (error) {
        console.error('Authentication check failed:', error);
        // On error, redirect to login
        window.location.href = '/login';
      }
    };

    checkAuthAndLoadData();
  }, []);

  // Variables moved to render section to avoid duplication
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
        companyName: onboardingData?.organizationName || 'Unknown Company',
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
      const finalDomain = selectedDomain || localStorage.getItem('selected-domain') || 
        generateSubdomain(allResponses.business_overview || 'business');
      
      // 🔥 CRITICAL: Complete onboarding with smart industry detection
      const industryAnalysis = smartIndustryDetection(allResponses);
      console.log('Industry Detection Results:', industryAnalysis);
      
const tenantAssignment = {
        businessType: onboardingData?.organizationName || allResponses.business_overview?.substring(0, 100) + "...",
        industry: industryAnalysis.industry,
        industryConfidence: industryAnalysis.confidence,
        industryReason: industryAnalysis.reason,
        subdomain: industryAnalysis.industry.replace(/_/g, '-') + '-business', // Suggest relevant domain based on industry
        accessLevel: userRole === 'admin' ? 1 : 3, // Level 1 for admin, Level 3 for technician
        userRole: userRole,
        isNewTenant: !isJoiningExisting,
        onboardingComplete: true,
        companyName: onboardingData?.organizationName || extractCompanyName(allResponses.business_overview || ''),
        responses: allResponses
      };

      // Call backend to create tenant and assign user with authentication
      const { authClient } = await import('@/lib/auth-client');
      const authHeaders = authClient.getAuthHeaders();
      
      const response = await fetch('https://api.docsflow.app/api/tenant/create', {
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
        
        // Set onboarding completion cookie
        document.cookie = 'onboarding-complete=true; path=/';
        document.cookie = `tenant-id=${tenantAssignment.subdomain}; path=/`;
        
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
        businessType: onboardingData?.organizationName || allResponses.business_overview?.substring(0, 100) + "...",
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
    // Generate a safe subdomain based on business name
    const words = businessOverview.split(' ').slice(0, 2);
    const subdomain = words.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '');
    return subdomain + '-' + Math.random().toString(36).substring(2, 8);
  };

  if (customPersonality) {
    return (
      <OptimizedCompletion
        responses={responses}
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <Card className="shadow-lg">
            <CardContent className="p-8 text-center">
              <Brain className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
              <h2 className="text-2xl font-bold mb-2">Creating Your Custom AI Assistant</h2>
              <p className="text-muted-foreground mb-6">Analyzing your responses to build the perfect business intelligence partner...</p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span>Understanding your business model...</span>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-200"></div>
                  <span>Identifying your key challenges...</span>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-400"></div>
                  <span>Customizing AI personality...</span>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-600"></div>
                  <span>Optimizing for your success metrics...</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

// Show domain selection on step 0 (FIRST STEP per Enterprise Architecture Plan)
  if (currentStep === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome to DocsFlow!</h1>
            <p className="text-muted-foreground">
              {onboardingData?.organizationName ? 
                `Let's set up your domain for ${onboardingData.organizationName}` :
                "Let's get your organization set up"}
            </p>
          </div>
          
          <DomainSelection
            companyName={onboardingData?.organizationName}
            onDomainSelected={handleDomainSelected}
            onInviteAccepted={handleInviteAccepted}
          />
        </div>
      </div>
    );
  }

  // Define variables for current question step
  const currentQuestionData = GENERIC_QUESTIONS[currentQuestion];
  const totalSteps = GENERIC_QUESTIONS.length + 1; // +1 for domain selection
  const currentProgress = currentStep; // currentStep accounts for domain selection
  const questionProgress = (currentProgress / totalSteps) * 100;

  return (
    <div className="h-screen bg-background p-2 sm:p-4 flex flex-col overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col h-full">
        {/* Compact Organization Info Header */}
        {onboardingData && (
          <div className="mb-2 bg-muted/50 p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-lg font-semibold text-foreground">
                  Setting up AI for {onboardingData.organizationName}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Subdomain: {onboardingData.subdomain}.docsflow.app • Industry: {onboardingData.industry}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-primary">
                  Step {currentStep + 1} of {totalSteps}
                </div>
                <div className="text-xs sm:text-sm font-medium text-foreground">
                  {userRole === 'admin' ? 'Admin Setup' : 'User Setup'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ultra Compact Progress Header */}
        <div className="flex items-center justify-between mb-2 sm:mb-3 bg-card p-2 sm:p-3 rounded-lg shadow-sm border border-border flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm sm:text-base">
              {currentQuestion + 1}
            </div>
            <div>
              <h1 className="text-sm sm:text-lg font-bold text-foreground">{currentQuestionData.question}</h1>
              <p className="text-xs text-muted-foreground">Question {currentQuestion + 1} of {GENERIC_QUESTIONS.length} • {Math.round(questionProgress)}% complete</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-primary">{currentQuestionData.impactMultiplier}</div>
              <div className="text-xs text-muted-foreground">impact</div>
            </div>
            <Progress value={questionProgress} className="w-16 sm:w-24" />
          </div>
        </div>

        {/* Main Content - Fills Remaining Space */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 min-h-0">
          
          {/* Left Column: Examples & Impact */}
          <div className="flex flex-col gap-2 sm:gap-3 min-h-0">
            {/* Impact Explanation - Ultra Compact */}
            <Card className="border-primary/20 bg-primary/10 flex-shrink-0">
              <CardContent className="p-2 sm:p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Why This Matters</h3>
                </div>
                <p className="text-muted-foreground text-xs mb-2">
                  {currentQuestionData.subtext}
                </p>
                <div className="flex items-center gap-1 bg-muted p-1 rounded text-xs">
                  <TrendingUp className="w-3 h-3 text-primary" />
                  <span className="text-foreground font-medium">
                    Detailed = {currentQuestionData.impactMultiplier} better results
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Examples - Scrollable */}
            <Card className="flex-1 flex flex-col min-h-0">
              <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-600" />
                  <CardTitle className="text-sm text-green-600 dark:text-green-400">High-Value Examples</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto min-h-0">
                <div className="space-y-2">
                  {currentQuestionData.examples.map((example: string, index: number) => (
                    <div key={index} className="p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <p className="text-xs text-green-800 dark:text-green-200 font-medium">{example}</p>
                      </div>
                    </div>
                  ))}
                  
                  <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      💡 <strong>Pro Tip:</strong> Copy and adapt these examples
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Response Input */}
          <Card className="flex flex-col min-h-0">
            <CardHeader className="pb-2 flex-shrink-0">
              <CardTitle className="text-sm sm:text-base">Your Response</CardTitle>
              <CardDescription className="text-xs">Be specific - more detail = better AI results</CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 min-h-0">
                <Textarea
                  id="response"
                  placeholder={currentQuestionData.placeholder}
                  value={currentResponse}
                  onChange={(e) => setCurrentResponse(e.target.value)}
                  className="resize-none h-full w-full text-sm"
                />
              </div>
              
              {/* Response Quality Indicator - Compact */}
              <div className="mt-2 p-2 rounded-lg bg-muted/50 flex-shrink-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-foreground">
                    {currentResponse.length > 100 ? '🎯 Excellent!' : 
                     currentResponse.length > 50 ? '✅ Good!' : 
                     currentResponse.length > 20 ? '⚠️ More detail' : 
                     '❌ Too brief'}
                  </span>
                  <span className="text-xs text-muted-foreground">{currentResponse.length}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full transition-all ${
                      currentResponse.length > 100 ? 'bg-green-500' :
                      currentResponse.length > 50 ? 'bg-primary' :
                      currentResponse.length > 20 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, (currentResponse.length / 200) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Navigation - Compact */}
              <div className="flex gap-2 mt-2 flex-shrink-0">
                {currentQuestion > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentQuestion(currentQuestion - 1)}
                    className="flex-1 text-xs sm:text-sm h-8 sm:h-10"
                  >
                    ← Previous
                  </Button>
                )}
                <Button 
                  onClick={handleNext}
                  disabled={currentResponse.trim().length < 20}
                  className="flex-1 text-xs sm:text-sm h-8 sm:h-10"
                >
                  {isLastQuestion ? (
                    <>
                      <Brain className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      Create AI
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 