"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
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
  const [realStats, setRealStats] = useState({
    documentsCount: 0,
    questionsCount: 0,
    hoursSaved: 0
  })

  // Load tenant context and check onboarding completion
  useEffect(() => {
    const loadTenantContext = async () => {
      try {
        console.log(`🔍 [DASHBOARD] Starting loadTenantContext at ${new Date().toISOString()}`);
        
        // CRITICAL FIX: Check if on main domain and redirect before API calls
        const hostname = window.location.hostname;
        console.log(`🔍 [DASHBOARD] Current hostname: ${hostname}`);
        
        if (hostname === 'www.docsflow.app' || hostname === 'docsflow.app') {
          console.log('🔍 [DASHBOARD] Main domain detected, checking for tenant context...');
          
          // SECURITY FIX: Standardized tenant storage - separate UUID and subdomain
          const storedTenantUUID = localStorage.getItem('tenant-uuid');
          const storedTenantSubdomain = localStorage.getItem('tenant-subdomain');
          const authToken = document.cookie.includes('sb-lhcopwwiqwjpzbdnjovo-auth-token');
          
          console.log(`🔍 [DASHBOARD] Main domain auth state:`, {
            storedTenantUUID: storedTenantUUID ? `${storedTenantUUID.substring(0, 8)}...` : 'MISSING',
            storedTenantSubdomain: storedTenantSubdomain || 'MISSING',
            authToken: authToken ? 'PRESENT' : 'MISSING',
            cookieCount: document.cookie.split(';').length
          });
          
          if (authToken && storedTenantSubdomain) {
            console.log(`🎯 Redirecting to tenant subdomain: ${storedTenantSubdomain}`);
            window.location.href = `https://${storedTenantSubdomain}.docsflow.app/dashboard`;
            return;
          }
          
          // Fallback: Check legacy storage format
          if (authToken && storedTenantUUID) {
            const legacyTenantData = localStorage.getItem(`tenant-${storedTenantUUID}`);
            if (legacyTenantData) {
              const tenantInfo = JSON.parse(legacyTenantData);
              if (tenantInfo.tenantSubdomain) {
                // Migrate to new storage format
                localStorage.setItem('tenant-subdomain', tenantInfo.tenantSubdomain);
                localStorage.setItem('tenant-uuid', storedTenantUUID);
                console.log(`🎯 Migrated and redirecting to: ${tenantInfo.tenantSubdomain}`);
                window.location.href = `https://${tenantInfo.tenantSubdomain}.docsflow.app/dashboard`;
                return;
              }
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
          window.location.href = '/onboarding';
          return;
        }

        // Check user authentication and onboarding status from backend
        const response = await fetch('/api/auth/check-user', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          // User not authenticated, redirect to login
          window.location.href = '/login';
          return;
        }

        const userData = await response.json();
        
        // Check if user has completed onboarding
        if (!userData.onboardingComplete) {
          console.log('User has not completed onboarding, redirecting...');
          window.location.href = '/onboarding';
          return;
        }

        // Check if user has a tenant association
        if (!userData.tenantId) {
          console.log('User has no tenant association, redirecting to onboarding...');
          window.location.href = '/onboarding';
          return;
        }

        // Set tenant context from backend data
        const context: TenantContext = {
          tenantId: userData.tenantId,
          tenantSubdomain: userData.tenant?.subdomain || '',
          industry: userData.industry || 'general',
          businessType: userData.businessType || 'General Business',
          accessLevel: userData.accessLevel || 1,
          onboardingComplete: userData.onboardingComplete
        };

        setTenantContext(context);
        
        // Store context in localStorage for faster subsequent loads
        localStorage.setItem(`tenant-${userData.tenantId}`, JSON.stringify(context));
        
        // Fetch real data from backend with subdomain
        if (userData.tenant?.subdomain) {
          await fetchRealData(userData.tenantId, userData.tenant.subdomain);
        } else {
          console.error('🚨 [DASHBOARD] No tenant subdomain found in user data:', userData);
        }
        
      } catch (error) {
        console.error('Failed to load tenant context:', error);
        // On error, redirect to login to re-authenticate
        window.location.href = '/login';
      } finally {
        setIsLoading(false);
      }
    }

    loadTenantContext();
  }, [])

  // Fetch real data from backend APIs
  const fetchRealData = async (tenantId: string, subdomain: string) => {
    try {
      // SECURITY FIX: Use subdomain in headers, not URL paths for tenant context
      const tenantHeaders = {
        'Content-Type': 'application/json',
        'x-tenant-subdomain': subdomain,
        'x-tenant-id': tenantId
      };

      // Fetch documents
      console.log(`🔍 [DASHBOARD] Fetching documents with headers:`, tenantHeaders);
      const docsResponse = await fetch('/api/documents', {
        method: 'GET',
        headers: tenantHeaders,
        credentials: 'include'
      });
      
      console.log(`🔍 [DASHBOARD] Documents API response status: ${docsResponse.status}`);
      
      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        const documentsCount = docsData.documents?.length || 0;
        console.log(`🔍 [DASHBOARD] Found ${documentsCount} documents`);
        
        // Fetch conversations/questions
        const conversationsResponse = await fetch('/api/conversations', {
          method: 'GET',
          headers: tenantHeaders,
          credentials: 'include'
        });
        
        let questionsCount = 0;
        if (conversationsResponse.ok) {
          const convData = await conversationsResponse.json();
          questionsCount = convData.conversations?.length || 0;
        }
        
        // Calculate hours saved (estimate: 15 min per document, 5 min per question)
        const hoursSaved = Math.round((documentsCount * 0.25 + questionsCount * 0.083) * 10) / 10;
        
        setRealStats({
          documentsCount,
          questionsCount,
          hoursSaved
        });
        
        console.log(`✅ [DASHBOARD] Updated real stats:`, {
          documentsCount,
          questionsCount, 
          hoursSaved
        });
      } else {
        const errorText = await docsResponse.text();
        console.error(`🚨 [DASHBOARD] Documents API error: ${docsResponse.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('🚨 [DASHBOARD] Error fetching real data:', error);
      // Keep using mock data on error
    }
  }

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

    // Use real stats from backend instead of localStorage
    const analytics = {
      documentsUploaded: realStats.documentsCount,
      totalQuestions: realStats.questionsCount,
      timesSaved: realStats.hoursSaved
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
        {/* Stats and Quick Actions Row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-fit">
          {/* Stats - 3 columns */}
          {stats.map((stat, index) => (
            <Card key={index} className="h-fit">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {stat.title}
                    </p>
                    <p className="text-xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <stat.icon className="h-5 w-5 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          ))}
          
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
                      <Badge variant={tenantContext?.accessLevel === 2 ? "default" : "secondary"}>
                        {tenantContext?.accessLevel === 1 ? 'Admin' : 
                         tenantContext?.accessLevel === 2 ? 'Manager' : 'User'}
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
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700">
                        <strong>Manager Access:</strong> You can view the AI configuration. Contact your admin to request persona modifications.
                      </p>
                    </div>
                  )}
                  {tenantContext?.accessLevel === 3 && (
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
