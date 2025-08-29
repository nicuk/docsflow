"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useDocuments, useConversations } from "@/lib/queries/documents"
import {
  BarChart3,
  Bell,
  ChevronDown,
  FileText,
  HelpCircle,
  Home,
  Inbox,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  Upload,
  User,
  Wrench,
  Truck,
  Building,
  TrendingUp,
  Clock,
  Target,
  Brain,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import BackendStatus from "@/components/backend-status"
import { SecurityMonitor } from "@/components/security-monitor"
import PersonaEditor from "@/components/persona-editor"
import { ProgressiveStats } from "@/components/dashboard/progressive-stats"
import { PersonaCardSkeleton } from "@/components/dashboard/stats-skeleton"

// Industry-specific types
interface TenantContext {
  tenantId: string
  tenantSubdomain: string
  industry: 'motorcycle_dealer' | 'warehouse_distribution' | 'general'
  businessType: string
  accessLevel: number
  onboardingComplete: boolean
}

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [redirectMessage, setRedirectMessage] = useState("")
  const [realStats, setRealStats] = useState({
    documentsCount: 0,
    questionsCount: 0,
    hoursSaved: 0
  })
  
  // 🚀 REACT QUERY: Automatic caching and background refetch
  const { data: documents = [], isLoading: isDocumentsLoading } = useDocuments(tenantContext?.tenantId)
  const { data: conversations = [], isLoading: isConversationsLoading } = useConversations(tenantContext?.tenantId)
  
  // 🚀 MAIN DOMAIN REDIRECT CHECK: Show loading immediately
  const [isMainDomain] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.location.hostname === 'www.docsflow.app' || window.location.hostname === 'docsflow.app'
  })

  // 🎯 IMMEDIATE REDIRECT FOR MAIN DOMAIN
  useEffect(() => {
    if (isMainDomain) {
      setIsRedirecting(true)
      setRedirectMessage("Connecting to your workspace...")
      
      // Quick redirect without heavy loading
      const redirectToWorkspace = async () => {
        try {
          const { EnterpriseSessionManager } = await import('@/lib/enterprise-session-manager')
          const userSession = EnterpriseSessionManager.getUserSession()
          
          if (userSession?.activeTenants?.length) {
            const firstTenant = userSession.activeTenants[0]
            if (firstTenant?.subdomain) {
              window.location.replace(`https://${firstTenant.subdomain}.docsflow.app/dashboard`)
              return
            }
          }
          
          window.location.replace('/onboarding')
        } catch (error) {
          console.error('Redirect error:', error)
          window.location.replace('/onboarding')
        }
      }
      
      redirectToWorkspace()
    }
  }, [isMainDomain])

  // Load tenant context and check onboarding completion
  useEffect(() => {
    const loadTenantContext = async () => {
      try {
        console.log(`🔍 [DASHBOARD] Starting loadTenantContext at ${new Date().toISOString()}`);
        
        // Initialize redirect handler
        const { RedirectHandler } = await import('@/utils/redirect-handler');
        RedirectHandler.initialize(setIsRedirecting, setRedirectMessage);
        
        // CRITICAL FIX: Check if on main domain and redirect before API calls
        const hostname = window.location.hostname;
        console.log(`🔍 [DASHBOARD] Current hostname: ${hostname}`);
        
        if (hostname === 'www.docsflow.app' || hostname === 'docsflow.app') {
          console.log('🔍 [DASHBOARD] Main domain detected, checking for tenant context...');
          
          // Check for cookie-based redirect first
          const hasRedirected = await RedirectHandler.checkCookieRedirect();
          if (hasRedirected) return;
          
          // ENTERPRISE FIX: Use proper session management for tenant detection
          const { EnterpriseSessionManager } = await import('@/lib/enterprise-session-manager');
          
          const userSession = EnterpriseSessionManager.getUserSession();
          const tenantContext = EnterpriseSessionManager.getTenantContext();
          const authToken = document.cookie.includes('access_token') || document.cookie.includes('sb-lhcopwwiqwjpzbdnjovo-auth-token');
          
          console.log(`🔍 [DASHBOARD] Main domain auth state:`, {
            hasUserSession: !!userSession,
            hasTenantContext: !!tenantContext,
            activeTenants: userSession?.activeTenants?.length || 0,
            authToken: authToken ? 'PRESENT' : 'MISSING'
          });
          
          // DEFENSIVE REDIRECT: Validate subdomain before redirect to prevent malformed URLs
          if (authToken && tenantContext?.subdomain && tenantContext.subdomain.length > 0) {
            console.log(`🎯 [ENTERPRISE] Redirecting to tenant subdomain: ${tenantContext.subdomain}`);
            await RedirectHandler.redirectWithLoading({
              destination: `https://${tenantContext.subdomain}.docsflow.app/dashboard`,
              message: `Redirecting to ${tenantContext.subdomain}...`
            });
            return;
          }
          
          // Fallback: Check if user has any active tenants with valid subdomains
          if (authToken && userSession?.activeTenants?.length) {
            const firstTenant = userSession.activeTenants[0];
            if (firstTenant?.subdomain && firstTenant.subdomain.length > 0) {
              console.log(`🎯 [ENTERPRISE] Redirecting to first active tenant: ${firstTenant.subdomain}`);
              await RedirectHandler.redirectWithLoading({
                destination: `https://${firstTenant.subdomain}.docsflow.app/dashboard`,
                message: `Connecting to ${firstTenant.subdomain}...`
              });
              return;
            } else {
              console.warn(`⚠️ [ENTERPRISE] First tenant has invalid subdomain, will check API for tenant data before redirecting to login`);
              // Don't immediately redirect - let the API call below check for tenant data
              // This prevents premature redirects when tenant context cookie isn't set yet
            }
          }
          
          // CRITICAL FIX: Check if user just logged in (give login page time to execute session bridge)
          const justLoggedIn = sessionStorage.getItem('just-logged-in');
          if (justLoggedIn) {
            console.log('⏳ User just logged in, waiting for session bridge redirect...');
            sessionStorage.removeItem('just-logged-in');
            // Give login page time to execute its session bridge logic
            setTimeout(() => {
              // If still on main domain after 3 seconds, then redirect to onboarding
              if (window.location.hostname === 'docsflow.app' || window.location.hostname === 'www.docsflow.app') {
                console.log('🔐 No tenant context on main domain, redirecting to onboarding');
                window.location.href = '/onboarding';
              }
            }, 3000);
            return;
          }
          
          // No tenant context or not authenticated - redirect to onboarding
          console.log('🔐 No tenant context on main domain, redirecting to onboarding');
          await RedirectHandler.redirectWithLoading({
            destination: '/onboarding',
            message: 'Setting up your workspace...'
          });
          return;
        }

        // Check user authentication and onboarding status from backend
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          // User not authenticated, redirect to login
          window.location.href = '/login';
          return;
        }

        const userData = await response.json();
        
        // DIAGNOSTIC LOGGING: Track tenant data to find where it's lost
        console.log(`🔍 [DASHBOARD] Raw userData from API:`, {
          email: userData.email,
          tenantId: userData.tenantId,
          hasTenant: !!userData.tenant,
          tenant: userData.tenant,
          tenantSubdomain: userData.tenant?.subdomain
        });
        
                // Consolidated onboarding check
        const needsOnboarding = await RedirectHandler.checkOnboardingAndRedirect(userData);
        if (needsOnboarding) return;

        // Set tenant context from backend data
        const context: TenantContext = {
          tenantId: userData.tenantId,
          tenantSubdomain: userData.tenant?.subdomain || '',
          industry: userData.tenant?.industry || 'general',
          businessType: userData.tenant?.industry || 'General Business',
          accessLevel: 2, // Default access level (user)
          onboardingComplete: userData.onboardingComplete
        };

        setTenantContext(context);
        
        // ENTERPRISE FIX: Use proper session management instead of localStorage
        const { EnterpriseSessionManager } = await import('@/lib/enterprise-session-manager');
        
        // DEFENSIVE STORAGE: Only store valid subdomain to prevent empty string corruption
        if (userData.tenant?.subdomain && userData.tenant.subdomain.length > 0) {
          EnterpriseSessionManager.setTenantContext(userData.tenantId, userData.tenant.subdomain);
          
          // Check for tenant subdomain redirect
          const hasRedirected = await RedirectHandler.checkTenantRedirect(userData);
          if (hasRedirected) return;
        }
        
        // Set user session with tenant access
        EnterpriseSessionManager.setUserSession({
          userId: userData.id,
          userEmail: userData.email,
          activeTenants: [{
            tenantId: userData.tenantId,
            subdomain: userData.tenant?.subdomain || '',
            userEmail: userData.email,
            lastAccessed: Date.now()
          }]
        });
        
        console.log(`✅ [DASHBOARD] Set enterprise session for: ${userData.email}`);
        
        // 🚀 OPTIMISTIC UI: Set tenant context immediately, load documents in background
        setTenantContext(context);
        setIsLoading(false); // Show dashboard immediately
        
        // 🎯 REACT QUERY: Data will automatically load in background
        // No manual API calls needed - React Query handles it
        console.log('✅ [DASHBOARD] React Query will handle document loading automatically');
        
      } catch (error) {
        console.error('Failed to load tenant context:', error);
        // On error, redirect to login to re-authenticate
        window.location.href = '/login';
      }
    }

    loadTenantContext();
  }, [])

  // 🚀 REACT QUERY: No manual data fetching needed
  // Documents and conversations are automatically loaded via useDocuments/useConversations hooks

  // Industry-specific welcome messages
  const getWelcomeMessage = () => {
    if (!tenantContext) return "Welcome to docsflow.app"
    
    switch (tenantContext.industry) {
      case 'motorcycle_dealer':
        return "Welcome to your Motorcycle Dealership Intelligence Center"
      case 'warehouse_distribution':
        return "Welcome to your Warehouse & Distribution Command Center"
      default:
        return "Welcome to your Business Intelligence Dashboard"
    }
  }

  const getWelcomeDescription = () => {
    if (!tenantContext) return "Here's an overview of your docsflow.app platform"
    
    switch (tenantContext.industry) {
      case 'motorcycle_dealer':
        return "Analyze inventory, sales trends, contracts, and customer data to optimize your dealership operations"
      case 'warehouse_distribution':
        return "Monitor inventory levels, supplier performance, and operational efficiency across your distribution network"
      default:
        return "Analyze your business documents to gain insights and make data-driven decisions"
    }
  }

  // Industry-specific quick actions
  const getQuickActions = () => {
    if (!tenantContext) return []
    
    switch (tenantContext.industry) {
      case 'motorcycle_dealer':
        return [
          {
            title: "Analyze Inventory Turnover",
            description: "Upload inventory reports to track which bike models sell fastest",
            icon: TrendingUp,
            action: "/dashboard/chat?prompt=analyze+inventory+turnover+by+bike+model"
          },
          {
            title: "Review Sales Contracts",
            description: "Upload contracts to analyze terms, warranties, and financing",
            icon: FileText,
            action: "/dashboard/chat?prompt=review+motorcycle+sales+contracts"
          },
          {
            title: "Track Manufacturer Performance",
            description: "Compare warranty claims and customer satisfaction by brand",
            icon: BarChart3,
            action: "/dashboard/chat?prompt=compare+motorcycle+manufacturer+performance"
          },
          {
            title: "Seasonal Demand Analysis",
            description: "Identify peak seasons and plan inventory accordingly",
            icon: Clock,
            action: "/dashboard/chat?prompt=analyze+seasonal+motorcycle+demand+patterns"
          }
        ]
      case 'warehouse_distribution':
        return [
          {
            title: "Monitor Inventory Levels",
            description: "Track stock levels and identify reorder points by SKU",
            icon: Target,
            action: "/dashboard/chat?prompt=monitor+warehouse+inventory+levels+by+SKU"
          },
          {
            title: "Supplier Performance Metrics",
            description: "Analyze delivery times, quality, and cost efficiency",
            icon: Truck,
            action: "/dashboard/chat?prompt=analyze+supplier+performance+metrics"
          },
          {
            title: "Shipping Cost Analysis",
            description: "Optimize shipping routes and reduce fulfillment costs",
            icon: BarChart3,
            action: "/dashboard/chat?prompt=analyze+shipping+cost+efficiency"
          },
          {
            title: "Order Fulfillment Times",
            description: "Track and improve order processing speed",
            icon: Clock,
            action: "/dashboard/chat?prompt=review+order+fulfillment+times"
          }
        ]
      default:
        return [
          {
            title: "Upload Documents",
            description: "Start by uploading your business documents",
            icon: Upload,
            action: "/dashboard/chat"
          },
          {
            title: "Ask Questions",
            description: "Use natural language to query your documents",
            icon: MessageSquare,
            action: "/dashboard/chat"
          },
          {
            title: "Analyze Performance",
            description: "Generate insights and reports from your data",
            icon: BarChart3,
            action: "/dashboard/analytics"
          },
          {
            title: "Generate Reports",
            description: "Create comprehensive business intelligence reports",
            icon: FileText,
            action: "/dashboard/documents"
          }
        ]
    }
  }

  // Industry-specific stats
  const getIndustryStats = () => {
    if (!tenantContext) return [
      { title: "Total Documents", value: "0", icon: FileText },
      { title: "Questions Asked", value: "0", icon: MessageSquare },
      { title: "Hours Saved", value: "0", icon: BarChart3 },
    ]

    // 🚀 REACT QUERY: Use live data from cached queries
    const analytics = {
      documentsUploaded: documents.length,
      totalQuestions: conversations.length,
      timesSaved: Math.round((documents.length * 0.25 + conversations.length * 0.083) * 10) / 10
    }
    
    switch (tenantContext.industry) {
      case 'motorcycle_dealer':
        return [
          { title: "Inventory Documents", value: analytics.documentsUploaded?.toString() || "0", icon: Wrench },
          { title: "Sales Insights", value: analytics.totalQuestions?.toString() || "0", icon: TrendingUp },
          { title: "Time Saved", value: `${Math.round(analytics.timesSaved || 0)}h`, icon: Clock },
        ]
      case 'warehouse_distribution':
        return [
          { title: "Logistics Documents", value: analytics.documentsUploaded?.toString() || "0", icon: Truck },
          { title: "Operational Queries", value: analytics.totalQuestions?.toString() || "0", icon: Target },
          { title: "Efficiency Gained", value: `${Math.round(analytics.timesSaved || 0)}h`, icon: Clock },
        ]
      default:
        return [
          { title: "Total Documents", value: analytics.documentsUploaded?.toString() || "0", icon: FileText },
          { title: "Questions Asked", value: analytics.totalQuestions?.toString() || "0", icon: MessageSquare },
          { title: "Hours Saved", value: `${Math.round(analytics.timesSaved || 0)}h`, icon: BarChart3 },
        ]
    }
  }

  // State for real user data
  const [user, setUser] = useState({
    name: "Loading...",
    email: "loading@example.com",
    avatar: "/placeholder-user.jpg",
  });

  // Fetch real user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get user from session storage (set during login)
        const userData = sessionStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          
          // CRITICAL: Check onboarding completion per enterprise architecture plan
          if (!parsedUser.onboarding_complete) {
            // Redirect to onboarding if not completed
            window.location.href = '/onboarding';
            return;
          }
          
          setUser({
            name: parsedUser.email?.split('@')[0] || "User",
            email: parsedUser.email || "user@example.com",
            avatar: "/placeholder-user.jpg",
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
  }, []);

  const stats = getIndustryStats()
  const quickActions = getQuickActions()

  // Recent activity instead of redundant quick actions
  const recentActivity = [
    {
      type: "info",
      title: tenantContext?.industry === 'motorcycle_dealer' 
        ? "Ready for Motorcycle Dealership Analysis"
        : tenantContext?.industry === 'warehouse_distribution'
        ? "Ready for Warehouse Operations Analysis"
        : "Welcome to docsflow.app",
      description: tenantContext?.industry === 'motorcycle_dealer'
        ? "Upload inventory reports, sales contracts, or manufacturer documents to get started"
        : tenantContext?.industry === 'warehouse_distribution'
        ? "Upload inventory data, supplier reports, or shipping documents to optimize operations"
        : "Upload your first document to get started with AI-powered document analysis",
      time: "Just now",
      icon: tenantContext?.industry === 'motorcycle_dealer' ? Wrench
           : tenantContext?.industry === 'warehouse_distribution' ? Truck
           : FileText
    }
  ]

  // Loading state
  // Show redirect overlay when redirecting
  if (isRedirecting) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-95 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">{redirectMessage}</h2>
          <p className="text-gray-600">Please wait while we connect you to your workspace...</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <ScrollArea className="flex-1">
        <div className="container mx-auto p-4 md:p-6 max-w-7xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Welcome section with industry context - Compact */}
      <section className="mb-4">
        <div className="mb-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {getWelcomeMessage()}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {getWelcomeDescription()}
          </p>
        </div>
      </section>

      {/* Main content grid - Optimized for viewport */}
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        {/* 🚀 PROGRESSIVE LOADING: Stats load in stages for better UX */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-fit">
          <div className="lg:col-span-3">
            <ProgressiveStats />
          </div>
          
          {/* Quick Action - 1 column */}
          <Card className="h-fit">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Quick Start
                  </p>
                  <p className="text-sm font-medium mt-1">Start Analysis</p>
                </div>
                <Button asChild size="sm">
                  <Link href="/dashboard/chat">
                    <MessageSquare className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Row - Takes remaining space */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
          {/* Admin-only Components - Backend Status & Security Monitor */}
          {tenantContext?.accessLevel === 1 && (
            <>
              {/* Backend Status - ADMIN ONLY */}
              <div>
                <BackendStatus />
              </div>
              
              {/* Security Monitor - ADMIN ONLY */}
              <div>
                <SecurityMonitor />
              </div>
            </>
          )}

          {/* AI Persona Editor - ADMIN ONLY */}
          {tenantContext?.accessLevel === 1 && (
            <div className="lg:col-span-2">
              <PersonaEditor 
                tenantId={tenantContext?.tenantId || ''}
                onPersonaUpdated={(persona) => {
                  console.log('Persona updated by admin:', persona);
                  // Optionally refresh tenant context
                }}
              />
            </div>
          )}

          {/* AI Persona Viewer - NON-ADMIN USERS */}
          {tenantContext?.accessLevel !== 1 && (
            <div className="lg:col-span-2">
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Current AI Persona
                  </CardTitle>
                  <CardDescription>
                    Your organization's AI assistant configuration
                    {tenantContext?.accessLevel === 2 && (
                      <span className="text-orange-600"> • Contact admin to request changes</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">AI Role</Label>
                      <p className="text-sm text-muted-foreground">Business Intelligence Assistant</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Communication Tone</Label>
                      <p className="text-sm text-muted-foreground">Professional and helpful</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Industry Focus</Label>
                      <p className="text-sm text-muted-foreground">{tenantContext?.industry || 'General'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Access Level</Label>
                      <Badge variant={tenantContext?.accessLevel === 1 ? "destructive" : "default"}>
                        {tenantContext?.accessLevel === 1 ? 'Admin' : 'User'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Focus Areas</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="outline">Document Analysis</Badge>
                      <Badge variant="outline">Business Insights</Badge>
                      <Badge variant="outline">Decision Support</Badge>
                    </div>
                  </div>
                  {tenantContext?.accessLevel === 2 && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600">
                        <strong>User Access:</strong> You can view and use the AI assistant. Speak with management for configuration changes.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Regular User Content */}
          {tenantContext?.accessLevel !== 1 && (
            <>
              {/* User Dashboard Content */}
              <Card className="h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                  <CardDescription className="text-xs">Get started with your workspace</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href="/dashboard/documents">
                        <FileText className="h-4 w-4 mr-1" />
                        Documents
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/dashboard/chat">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Chat AI
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Analytics Preview */}
              <Card className="h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Analytics</CardTitle>
                  <CardDescription className="text-xs">Your document insights</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Documents</span>
                      <span className="font-medium">24</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Conversations</span>
                      <span className="font-medium">12</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Queries</span>
                      <span className="font-medium">48</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          
          {/* Getting Started - Full width */}
          <Card className="h-fit lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {tenantContext?.industry === 'motorcycle_dealer' 
                  ? "Dealership Setup"
                  : tenantContext?.industry === 'warehouse_distribution'
                  ? "Operations Setup"
                  : "Getting Started"}
              </CardTitle>
              <CardDescription className="text-xs">
                {tenantContext?.industry === 'motorcycle_dealer' 
                  ? "Optimize your dealership with AI"
                  : tenantContext?.industry === 'warehouse_distribution'
                  ? "Streamline warehouse operations"
                  : "Set up docsflow.app"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2"></div>
                  <div className="flex-1">
                    <p className="text-xs font-medium">
                      {tenantContext?.industry === 'motorcycle_dealer' 
                        ? "Upload inventory documents"
                        : tenantContext?.industry === 'warehouse_distribution'
                        ? "Upload logistics documents"
                        : "Upload your first document"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tenantContext?.industry === 'motorcycle_dealer' 
                        ? "Inventory, sales reports, contracts"
                        : tenantContext?.industry === 'warehouse_distribution'
                        ? "Stock reports, supplier data, shipping"
                        : "PDF, Word, Excel, PowerPoint files"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2"></div>
                  <div className="flex-1">
                    <p className="text-xs font-medium">
                      {tenantContext?.industry === 'motorcycle_dealer' 
                        ? "Ask dealership questions"
                        : tenantContext?.industry === 'warehouse_distribution'
                        ? "Ask operations questions"
                        : "Ask your first question"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tenantContext?.industry === 'motorcycle_dealer' 
                        ? "Which bikes sell fastest?"
                        : tenantContext?.industry === 'warehouse_distribution'
                        ? "What's our top SKU?"
                        : "Use natural language queries"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2"></div>
                  <div className="flex-1">
                    <p className="text-xs font-medium">
                      {tenantContext?.industry === 'motorcycle_dealer' 
                        ? "Analyze performance"
                        : tenantContext?.industry === 'warehouse_distribution'
                        ? "Monitor efficiency"
                        : "Explore insights"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tenantContext?.industry === 'motorcycle_dealer' 
                        ? "Sales trends, customer preferences"
                        : tenantContext?.industry === 'warehouse_distribution'
                        ? "Inventory turnover, costs"
                        : "Automated insights & analytics"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button asChild className="w-full" size="sm">
                <Link href="/dashboard/chat">
                  {tenantContext?.industry === 'motorcycle_dealer' 
                    ? "Start Analysis"
                    : tenantContext?.industry === 'warehouse_distribution'
                    ? "Start Operations"
                    : "Get Started"}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
